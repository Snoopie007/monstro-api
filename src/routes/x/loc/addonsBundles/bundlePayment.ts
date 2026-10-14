import { db } from "@/db/db";
import { enqueueSubscriptionAddonJob } from "@/queues/subscriptionAddons";
import { bundlePurchases, memberInvoices, memberSubscriptions } from "@/subtrees/schemas";
import type { BundlePaymentResponse, BundlePaymentState } from "@/subtrees/types";
import { chargeWithGateway } from "@/utils/checkoutUtil";
import { getCheckoutContext } from "@/utils/getCheckoutContext";
import { and, asc, eq } from "drizzle-orm";
import {
  activateCashSubscription,
  findCashSubscriptions,
  hasCashBillingDefinition,
  planCashActivation,
  type BillableCashSubscription,
  type CashActivation,
} from "../subscriptions/cashActivation";
import { chargeBundleInvoice } from "./bundleCharge";
import { activateBundlePurchase, getBundlePurchaseSummary } from "./bundlePurchases";
import {
  bundlePaymentState,
  collectBundlePayment,
  readBundleInvoice,
  recordBundlePayment,
} from "./bundleSettlement";

type PayBundlePurchaseInput = { locationId: string; bundleId: string; purchaseId: string; paymentMethodId?: string; paymentType?: "card" | "us_bank_account" };

type PayableBundle = { status: "payable"; memberId: string; invoiceId: string | null };

export type PayBundlePurchaseResult =
  | { status: "not-found" | "inactive" }
  | { status: "ok"; value: BundlePaymentResponse };

async function findPayableBundle(input: PayBundlePurchaseInput): Promise<PayableBundle | { status: "not-found" | "inactive" }> {
  const purchase = await db.query.bundlePurchases.findFirst({
    where: and(eq(bundlePurchases.id, input.purchaseId), eq(bundlePurchases.bundleId, input.bundleId)),
    columns: { status: true, memberId: true, invoiceId: true },
    with: {
      bundle: { columns: { locationId: true } },
      subscriptions: { columns: { paymentType: true } },
    },
  });

  if (!purchase || purchase.bundle.locationId !== input.locationId) return { status: "not-found" };

  const cash = purchase.subscriptions.every((subscription) => subscription.paymentType === "cash");

  // Card purchases made before server checkout have no invoice to charge.
  if (purchase.status === "canceled" || purchase.status === "expired" || (!purchase.invoiceId && !cash)) {
    return { status: "inactive" };
  }

  return { status: "payable", memberId: purchase.memberId, invoiceId: purchase.invoiceId };
}

async function collectBundleInvoice(
  input: { locationId: string; memberId: string; invoiceId: string; paymentMethodId?: string; paymentType?: "card" | "us_bank_account" },
  charge: typeof chargeWithGateway | undefined,
): Promise<BundlePaymentState> {
  const invoice = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, input.invoiceId), with: { transaction: true } });
  if (!invoice?.transaction) throw new Error(`Bundle invoice ${input.invoiceId} has no pending charge`);
  const binding = readBundleInvoice(invoice.metadata);
  if (invoice.paid && binding.billingAttempt?.paymentIntentId) {
    if (!invoice.currency) throw new Error("Invoice currency is missing");

    await recordBundlePayment({
      status: "succeeded", invoiceId: invoice.id, attemptId: binding.billingAttempt.id, paymentIntentId: binding.billingAttempt.paymentIntentId,
      amount: invoice.total, currency: invoice.currency,
      gateway: { service: binding.gatewayService, stripeAccountId: binding.gatewayService === "stripe" ? binding.billingAttempt.stripeAccountId ?? null : undefined },
    });
    return "active";
  }
  const { gateway, gatewayCustomerId } = await getCheckoutContext({ lid: input.locationId, mid: input.memberId });
  if (input.paymentMethodId && gateway.service !== "stripe" && input.paymentType !== "card") throw new Error("This gateway only accepts saved cards");
  await collectBundlePayment({
    invoiceId: invoice.id,
    gateway: {
      service: gateway.service,
      integrationId: gateway.integrationId,
      customerId: gatewayCustomerId,
      stripeAccountId: gateway.service === "stripe" ? gateway.accountId : undefined,
    },
    retry: true,
    method: input.paymentMethodId ? {
      paymentMethodId: input.paymentMethodId,
      paymentType: input.paymentType ?? invoice.transaction.paymentType,
    } : undefined,
  }, request => chargeBundleInvoice(request, gateway, charge));
  const current = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, invoice.id), columns: { paid: true, metadata: true } });
  if (!current) throw new Error(`Bundle invoice ${invoice.id} disappeared during payment`);
  return bundlePaymentState(current);
}

/** Today's cash activation for every bundled subscription, in one transaction:
 * each gets its own cash invoice to collect. Add-ons then bill through their
 * worker and the bundle activates once its required add-ons are paid, as before
 * server checkout. */
async function activateCashBundle(locationId: string, purchaseId: string): Promise<BundlePaymentState | "inactive"> {
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
    if (!purchase || ["canceled", "expired"].includes(purchase.status)) return false;
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
  if (!collecting) return "inactive";

  const bundleActivation = await activateBundlePurchase(locationId, purchaseId);

  if (bundleActivation.status === "ready") {
    await Promise.all(bundleActivation.addonPurchaseIds.map((addonPurchaseId) =>
      enqueueSubscriptionAddonJob("activate", addonPurchaseId)
    ));
  }

  return "active";
}

async function requireBundlePurchaseSummary(locationId: string, purchaseId: string) {
  const purchase = await getBundlePurchaseSummary(locationId, purchaseId);

  if (!purchase) throw new Error(`Bundle purchase ${purchaseId} disappeared during payment`);

  return purchase;
}

/** Charges a prepared card purchase, or activates a cash one. Safe to call
 * again: it reports the current payment state instead of charging twice. */
export async function payBundlePurchase(
  input: PayBundlePurchaseInput,
  charge?: typeof chargeWithGateway,
): Promise<PayBundlePurchaseResult> {
  const bundle = await findPayableBundle(input);

  if (bundle.status !== "payable") return bundle;

  const payment = bundle.invoiceId
    ? await collectBundleInvoice({ locationId: input.locationId, memberId: bundle.memberId, invoiceId: bundle.invoiceId, paymentMethodId: input.paymentMethodId, paymentType: input.paymentType }, charge)
    : await activateCashBundle(input.locationId, input.purchaseId);

  if (payment === "inactive") return { status: "inactive" };

  return {
    status: "ok",
    value: { purchase: await requireBundlePurchaseSummary(input.locationId, input.purchaseId), payment },
  };
}
