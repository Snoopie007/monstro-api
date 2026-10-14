import type { BundleRefundChargeResult } from "@/subtrees/types";
import { z } from "zod";
import { refundBundleAuthorizeCharge } from "./bundleAuthorizeRefund";
import type { BundleRefundCharge } from "./bundleChargeOwnership";
import {
  bundleRefundFailure,
  loadBundleRefundGateway,
  refundBundleSquareCharge,
  refundBundleStripeCharge,
  type BundleRefundGateway,
} from "./bundleRefundGateways";
import {
  bundleRefundAmounts,
  claimBundleRefund,
  hasLegacyBundleRefund,
  readBundleRefundAttempt,
  rememberBundleRefundFailure,
  saveBundleRefundOutcome,
  type BundleRefundAttempt,
  type BundleRefundOutcome,
} from "./bundleRefundState";

function chargeResult(
  charge: BundleRefundCharge,
  gateway: BundleRefundChargeResult["gateway"],
  failure?: { status: "pending" | "failed"; message: string },
): BundleRefundChargeResult {
  const amounts = charge.attributionError
    ? { refundableAmount: 0, nonRefundableAmount: 0, refundedAmount: 0, remainingAmount: 0 }
    : bundleRefundAmounts(charge);
  const progress = failure ? null : readBundleRefundAttempt(charge.transaction.metadata);
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

async function runChargeRefund(
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
      return refundBundleStripeCharge(gateway, charge, attempt, reconcile);
    case "square":
      return refundBundleSquareCharge(gateway, charge, attempt, reconcile);
    case "authorize":
      return refundBundleAuthorizeCharge(gateway, charge, attempt, reconcile);
  }
}

/** Every charge owns its claim and outcome. An error here is returned alongside
 * the others; it never rolls back cancellation or stops the refund loop. */
export async function refundOneBundleCharge(charge: BundleRefundCharge): Promise<BundleRefundChargeResult> {
  const provider = z.enum(["stripe", "square", "authorize"]).safeParse(
    charge.transaction.metadata.gatewayService ?? charge.invoice.metadata?.gatewayService,
  );
  let gateway: BundleRefundChargeResult["gateway"] = charge.transaction.paymentType === "cash" ? "cash"
    : provider.success ? provider.data : "unavailable";

  try {
    if (charge.attributionError) throw new Error(charge.attributionError);

    const previous = readBundleRefundAttempt(charge.transaction.metadata);
    const amounts = bundleRefundAmounts(charge);

    if (amounts.remainingAmount === 0 && !hasLegacyBundleRefund(charge.transaction)
      && previous?.status !== "pending" && previous?.status !== "unknown") {
      return chargeResult(charge, previous?.gatewayService ?? gateway);
    }

    const paymentGateway = await loadBundleRefundGateway(charge);
    const claim = await claimBundleRefund(charge, paymentGateway.binding);
    gateway = paymentGateway.service;

    if (claim.action === "finished") return chargeResult(claim.charge, gateway);

    let outcome: BundleRefundOutcome;

    try {
      outcome = await runChargeRefund(paymentGateway, claim.charge, claim.attempt, claim.action === "reconcile");
    } catch (cause) {
      const failure = bundleRefundFailure(cause);

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
      const transaction = await saveBundleRefundOutcome(claim.charge, claim.attempt, outcome);

      return chargeResult({ ...claim.charge, transaction }, gateway);
    } catch {
      // The provider may have accepted the refund before a database failure.
      // The committed claim remains pending and is reconciled on the next call.
      return chargeResult(claim.charge, gateway, { status: "pending", message: "The refund result could not be saved. Check again before submitting another refund." });
    }
  } catch (cause) {
    const failure = bundleRefundFailure(cause);

    try {
      const transaction = await rememberBundleRefundFailure(charge, failure.message);
      const progress = readBundleRefundAttempt(transaction.metadata);
      const pending = progress?.status === "pending" || progress?.status === "unknown" || hasLegacyBundleRefund(transaction);

      return chargeResult({ ...charge, transaction }, progress?.gatewayService ?? gateway, {
        status: pending ? "pending" : "failed",
        message: failure.message,
      });
    } catch {
      return chargeResult(charge, gateway, { status: "pending", message: "The refund could not be checked or saved. Try again to confirm its status." });
    }
  }
}
