import type { BundleRefundChargeResult, BundleRefundResponse } from "@/subtrees/types";
import { z } from "zod";
import { cancelForRefund, finishCancellation, type BundleRefundInput } from "../cancellation";
import { getBundleSummary } from "../bundleSummary";
import { refundAuthorizeCharge } from "./authorize";
import { getRefundCharges, type BundleRefundCharge } from "./charges";
import { refundFailure, getRefundGateway, type BundleRefundGateway } from "./gateway";
import {
  bundleRefundAmounts,
  claimRefund,
  hasLegacyRefund,
  getRefundAttempt,
  saveRefundFailure,
  saveRefundOutcome,
  type BundleRefundAttempt,
  type BundleRefundOutcome,
} from "./state";
import { refundSquareCharge } from "./square";
import { refundStripeCharge } from "./stripe";

function chargeResult(
  charge: BundleRefundCharge,
  gateway: BundleRefundChargeResult["gateway"],
  failure?: { status: "pending" | "failed"; message: string },
): BundleRefundChargeResult {
  const amounts = charge.attributionError
    ? { refundableAmount: 0, nonRefundableAmount: 0, refundedAmount: 0, remainingAmount: 0 }
    : bundleRefundAmounts(charge);
  const progress = failure ? null : getRefundAttempt(charge.transaction.metadata);
  let status: BundleRefundChargeResult["status"];
  let message = failure?.message ?? progress?.error ?? null;

  if (failure) {
    status = failure.status;
  } else if (progress?.status === "pending" || progress?.status === "unknown") {
    status = "pending";
  } else if (amounts.remainingAmount === 0) {
    status = amounts.refundableAmount === 0 ? "skipped" : "refunded";
    message = amounts.refundableAmount === 0 ? "This charge contains only non-refundable fees." : null;
  } else {
    status = "failed";
    message ??= "Part of this charge is still refundable. Try again to finish.";
  }

  return {
    transactionId: charge.transaction.id,
    invoiceId: charge.invoice.id,
    description: charge.transaction.description ?? charge.invoice.description ?? "Bundle charge",
    chargedAt: (charge.transaction.chargeDate ?? charge.transaction.created).toISOString(),
    currency: charge.transaction.currency,
    gateway,
    chargedAmount: charge.transaction.total,
    refundableAmount: amounts.refundableAmount,
    refundedAmount: Math.min(amounts.refundableAmount, amounts.refundedAmount),
    remainingAmount: amounts.remainingAmount,
    nonRefundableAmount: amounts.nonRefundableAmount,
    status,
    message,
  };
}

async function runRefund(
  gateway: BundleRefundGateway,
  charge: BundleRefundCharge,
  attempt: BundleRefundAttempt,
  reconcile: boolean,
): Promise<BundleRefundOutcome> {
  if (attempt.attempt === 0 && !attempt.id) {
    return {
      status: "unknown",
      amount: attempt.amount,
      operation: attempt.operation,
      error: "An earlier refund has no confirmation ID. Staff must check the gateway before another refund is submitted.",
    };
  }

  switch (gateway.service) {
    case "cash":
      return { status: "completed", amount: attempt.amount, operation: "refund", id: `cash-${charge.transaction.id}-${attempt.attempt}` };
    case "stripe":
      return refundStripeCharge(gateway, charge, attempt, reconcile);
    case "square":
      return refundSquareCharge(gateway, charge, attempt, reconcile);
    case "authorize":
      return refundAuthorizeCharge(gateway, charge, attempt, reconcile);
  }
}

/** Every charge owns its claim and outcome. An error here is returned alongside
 * the others; it never rolls back cancellation or stops the refund loop. */
export async function refundCharge(charge: BundleRefundCharge): Promise<BundleRefundChargeResult> {
  const provider = z.enum(["stripe", "square", "authorize"]).safeParse(
    charge.transaction.metadata.gatewayService ?? charge.invoice.metadata?.gatewayService,
  );
  let gateway: BundleRefundChargeResult["gateway"] = charge.transaction.paymentType === "cash" ? "cash"
    : provider.success ? provider.data : "unavailable";

  try {
    if (charge.attributionError) throw new Error(charge.attributionError);

    const previous = getRefundAttempt(charge.transaction.metadata);
    const amounts = bundleRefundAmounts(charge);

    if (amounts.remainingAmount === 0 && !hasLegacyRefund(charge.transaction)
      && previous?.status !== "pending" && previous?.status !== "unknown") {
      return chargeResult(charge, previous?.gatewayService ?? gateway);
    }

    const paymentGateway = await getRefundGateway(charge);
    const claim = await claimRefund(charge, paymentGateway.binding);
    gateway = paymentGateway.service;

    if (claim.action === "finished") return chargeResult(claim.charge, gateway);

    let outcome: BundleRefundOutcome;

    try {
      outcome = await runRefund(paymentGateway, claim.charge, claim.attempt, claim.action === "reconcile");
    } catch (cause) {
      const failure = refundFailure(cause);

      // This catch covers inspections or local preparation. Provider submission
      // catches its own errors, so an interrupted operation remains unknown.
      outcome = {
        status: claim.action === "reconcile" ? "unknown" : "failed",
        amount: claim.attempt.amount,
        operation: claim.attempt.operation,
        error: failure.message,
      };
    }

    try {
      const transaction = await saveRefundOutcome(claim.charge, claim.attempt, outcome);

      return chargeResult({ ...claim.charge, transaction }, gateway);
    } catch {
      // The provider may have accepted the refund before a database failure.
      // The committed claim remains pending and is reconciled on the next call.
      return chargeResult(claim.charge, gateway, { status: "pending", message: "The refund result could not be saved. Check again before submitting another refund." });
    }
  } catch (cause) {
    const failure = refundFailure(cause);

    try {
      const transaction = await saveRefundFailure(charge, failure.message);
      const progress = getRefundAttempt(transaction.metadata);
      const pending = progress?.status === "pending" || progress?.status === "unknown" || hasLegacyRefund(transaction);

      return chargeResult({ ...charge, transaction }, progress?.gatewayService ?? gateway, {
        status: pending ? "pending" : "failed",
        message: failure.message,
      });
    } catch {
      return chargeResult(charge, gateway, { status: "pending", message: "The refund could not be checked or saved. Try again to confirm its status." });
    }
  }
}

/** Full refund-and-cancel only. Each retry discovers charges afresh, including
 * payments that completed after an earlier cancellation/refund request. */
export async function refundBundle(input: BundleRefundInput): Promise<{ status: "not-found" } | { status: "ok"; value: BundleRefundResponse }> {
  const bundle = await cancelForRefund(input);

  if (!bundle) return { status: "not-found" };

  const cancellationWarnings = await finishCancellation(bundle);
  const charges = await getRefundCharges(input.locationId, bundle);
  const results = await Promise.all(charges.map(refundCharge));

  const purchase = await getBundleSummary(input.locationId, input.purchaseId);

  if (!purchase) throw new Error("Bundle purchase disappeared after cancellation");

  return {
    status: "ok",
    value: {
      purchase,
      charges: results,
      cancellationWarnings,
      unfinished: cancellationWarnings.length > 0 || results.some((charge) => charge.status === "failed" || charge.status === "pending"),
    },
  };
}
