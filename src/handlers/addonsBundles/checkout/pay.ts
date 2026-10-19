import { db } from "@/db/db";
import { bundlePurchases, memberInvoices, memberSubscriptions } from "@/subtrees/schemas";
import { hasEnded } from "@/subtrees/utils/addonsBundles";
import type { BundlePaymentResponse, BundlePaymentState, PaymentType } from "@/subtrees/types";
import { chargeWithGateway } from "@/utils/checkoutUtil";
import { CheckoutError, getCheckoutContext, type CheckoutContext } from "@/utils/getCheckoutContext";
import { and, asc, eq } from "drizzle-orm";
import {
  activateCashSubscription,
  findCashSubscriptions,
  hasCashBillingDefinition,
  planCashActivation,
  type BillableCashSubscription,
  type CashActivation,
} from "@/routes/x/loc/subscriptions/cashActivation";
import { chargeBundleInvoice } from "./gatewayCharge";
import {
  bundlePaymentState,
  collectBundlePayment,
  getBundleBinding,
  reconcileBundle,
  recordBundlePayment,
} from "./settlement";
import { getBundleSummary } from "../bundleSummary";

type PayBundlePurchaseInput = { locationId: string; bundleId: string; purchaseId: string; paymentMethodId?: string; paymentType?: "card" | "us_bank_account" };

type PayableBundle = { status: "payable"; memberId: string; invoiceId: string | null };

type PaymentUnavailable = { status: "payment-unavailable"; error: string };

type CollectedPayment = { status: "ok"; payment: BundlePaymentState } | PaymentUnavailable | { status: "inactive" };

type PayBundlePurchaseResult =
  | { status: "not-found" | "inactive" }
  | PaymentUnavailable
  | { status: "ok"; value: BundlePaymentResponse };

async function getPayableBundle(input: PayBundlePurchaseInput): Promise<PayableBundle | { status: "not-found" | "inactive" }> {
  const purchase = await db.query.bundlePurchases.findFirst({
    where: and(eq(bundlePurchases.id, input.purchaseId), eq(bundlePurchases.bundleId, input.bundleId)),
    columns: { status: true, memberId: true, invoiceId: true },
    with: { bundle: { columns: { locationId: true } } },
  });

  if (!purchase || purchase.bundle.locationId !== input.locationId) return { status: "not-found" };

  if (hasEnded(purchase.status)) return { status: "inactive" };

  return { status: "payable", memberId: purchase.memberId, invoiceId: purchase.invoiceId };
}

/** Why the location's gateway cannot charge this saved payment, if it cannot.
 * Checked before the attempt is claimed, so the charge only fails on provider I/O. */
function chargeUnavailable(gateway: CheckoutContext["gateway"], paymentType: PaymentType, total: number): string | null {
  if (gateway.service === "stripe") return null;

  if (paymentType !== "card") return "This location's payment gateway only accepts saved cards";

  if (gateway.service === "square" && total > 0 && !gateway.metadata.squareLocationId) {
    return "This location's Square gateway has no Square location configured";
  }

  return null;
}

async function collectBundleInvoice(
  input: { locationId: string; memberId: string; invoiceId: string; paymentMethodId?: string; paymentType?: "card" | "us_bank_account" },
  charge: typeof chargeWithGateway | undefined,
): Promise<CollectedPayment> {
  const invoice = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, input.invoiceId), with: { transaction: true } });
  if (!invoice?.transaction) throw new Error(`Bundle invoice ${input.invoiceId} has no pending charge`);
  const binding = getBundleBinding(invoice.metadata);
  if (invoice.paid && binding.billingAttempt?.paymentIntentId) {
    if (!invoice.currency) throw new Error("Invoice currency is missing");

    await recordBundlePayment({
      status: "succeeded", invoiceId: invoice.id, attemptId: binding.billingAttempt.id, paymentIntentId: binding.billingAttempt.paymentIntentId,
      amount: invoice.total, currency: invoice.currency,
      gateway: { service: binding.gatewayService, stripeAccountId: binding.gatewayService === "stripe" ? binding.billingAttempt.stripeAccountId ?? null : undefined },
    });
    return { status: "ok", payment: "active" };
  }
  let context: CheckoutContext;

  try {
    context = await getCheckoutContext({ lid: input.locationId, mid: input.memberId });
  } catch (error) {
    if (error instanceof CheckoutError) return { status: "payment-unavailable", error: error.message };

    throw error;
  }

  const { gateway, gatewayCustomerId } = context;
  const method = input.paymentMethodId
    ? { paymentMethodId: input.paymentMethodId, paymentType: input.paymentType ?? invoice.transaction.paymentType }
    : undefined;
  const unavailable = chargeUnavailable(gateway, method?.paymentType ?? invoice.transaction.paymentType, invoice.total);

  if (unavailable) return { status: "payment-unavailable", error: unavailable };

  const collection = await collectBundlePayment({
    invoiceId: invoice.id,
    gateway: {
      service: gateway.service,
      integrationId: gateway.integrationId,
      customerId: gatewayCustomerId,
      stripeAccountId: gateway.service === "stripe" ? gateway.accountId : undefined,
    },
    retry: true,
    method,
  }, request => chargeBundleInvoice(request, gateway, charge));

  // Cancellation can commit between pay's first read and the claim.
  if (collection === "inactive") return { status: "inactive" };

  const current = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, invoice.id), columns: { paid: true, metadata: true } });
  if (!current) throw new Error(`Bundle invoice ${invoice.id} disappeared during payment`);
  return { status: "ok", payment: bundlePaymentState(current) };
}

/** Today's cash activation for every bundled subscription, in one transaction:
 * each gets its own cash invoice to collect. Add-ons then bill through their
 * worker and the bundle activates once its required add-ons are paid, as before
 * server checkout. */
async function activateCashBundle(locationId: string, purchaseId: string): Promise<CollectedPayment> {
  const subscriptions = await findCashSubscriptions(db, eq(memberSubscriptions.bundlePurchaseId, purchaseId));
  const activations: Array<{ subscription: BillableCashSubscription; activation: CashActivation }> = [];

  for (const subscription of subscriptions) {
    if (!hasCashBillingDefinition(subscription)) {
      throw new Error(`Bundled subscription ${subscription.id} has no billing definition`);
    }

    activations.push({ subscription, activation: await planCashActivation(subscription, locationId) });
  }

  const collecting = await db.transaction(async (tx) => {
    await tx.select({ id: bundlePurchases.id }).from(bundlePurchases).where(eq(bundlePurchases.id, purchaseId)).for("update");
    const purchase = await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.id, purchaseId), columns: { status: true, memberId: true } });
    if (!purchase || hasEnded(purchase.status)) return false;
    const currentSubscriptions = await tx.select().from(memberSubscriptions)
      .where(eq(memberSubscriptions.bundlePurchaseId, purchaseId))
      .orderBy(asc(memberSubscriptions.id)).for("update");
    if (currentSubscriptions.length !== activations.length) return false;
    const currentById = new Map(currentSubscriptions.map(subscription => [subscription.id, subscription]));
    for (const { subscription } of activations) {
      const current = currentById.get(subscription.id);
      if (!current || current.memberId !== purchase.memberId || current.locationId !== locationId
        || current.paymentType !== "cash" || !["incomplete", "active", "trialing", "past_due"].includes(current.status)
        || (current.cancelAt && current.cancelAt <= new Date())
        || current.memberPlanPricingId !== subscription.memberPlanPricingId || current.promoId !== subscription.promoId
        || current.currentPeriodStart.getTime() !== subscription.currentPeriodStart.getTime()
        || current.currentPeriodEnd.getTime() !== subscription.currentPeriodEnd.getTime()
        || current.trialEnd?.getTime() !== subscription.trialEnd?.getTime()) return false;
    }
    for (const { subscription, activation } of activations) {
      const current = currentById.get(subscription.id);
      if (!current) throw new Error(`Locked cash subscription ${subscription.id} disappeared`);
      await activateCashSubscription(tx, { ...subscription, ...current }, locationId, activation);
    }
    return true;
  });
  if (!collecting) return { status: "inactive" };

  await reconcileBundle(locationId, purchaseId);

  return { status: "ok", payment: "active" };
}

async function requireSummary(locationId: string, purchaseId: string) {
  const purchase = await getBundleSummary(locationId, purchaseId);

  if (!purchase) throw new Error(`Bundle purchase ${purchaseId} disappeared during payment`);

  return purchase;
}

/** Charges a prepared card purchase, or activates a cash one. Safe to call
 * again: it reports the current payment state instead of charging twice. */
export async function payBundle(
  input: PayBundlePurchaseInput,
  charge?: typeof chargeWithGateway,
): Promise<PayBundlePurchaseResult> {
  const bundle = await getPayableBundle(input);

  if (bundle.status !== "payable") return bundle;

  const collected = bundle.invoiceId
    ? await collectBundleInvoice({ locationId: input.locationId, memberId: bundle.memberId, invoiceId: bundle.invoiceId, paymentMethodId: input.paymentMethodId, paymentType: input.paymentType }, charge)
    : await activateCashBundle(input.locationId, input.purchaseId);

  if (collected.status !== "ok") return collected;

  return {
    status: "ok",
    value: { purchase: await requireSummary(input.locationId, input.purchaseId), payment: collected.payment },
  };
}
