import { eq } from "drizzle-orm";
import { bundlePurchases, memberSubscriptionAddons, memberSubscriptions } from "../../schemas";
import { addonNotCollectible } from "../addonsBundles";
import type { InvoicePaymentOutcome, InvoicePaymentTransaction, PaymentInvoice } from "./invoicePayments";

export type SubscriptionAddonSettlement = {
  purchaseId: string;
  subscriptionId: string;
  bundlePurchaseId: string | null;
  runAt: Date | null;
};

/** Settles the period stored on the invoice. Callers hold the purchase and
 * add-on locks before recording money or access, including manual cash payment. */
export async function settleSubscriptionAddonInvoice(
  tx: InvoicePaymentTransaction,
  invoice: PaymentInvoice,
  outcome: Pick<InvoicePaymentOutcome, "status">,
): Promise<SubscriptionAddonSettlement | null> {
  if (!invoice.memberSubscriptionAddonId || !invoice.forPeriodStart) {
    throw new Error(`Invoice ${invoice.id} has no stored add-on billing period`);
  }
  const purchase = await tx.query.memberSubscriptionAddons.findFirst({
    where: eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId),
  });
  if (!purchase) throw new Error(`Invoice ${invoice.id}'s add-on was not found`);
  const bundle = purchase.bundlePurchaseId ? await tx.query.bundlePurchases.findFirst({
    where: eq(bundlePurchases.id, purchase.bundlePurchaseId), columns: { status: true },
  }) : null;
  const subscription = await tx.query.memberSubscriptions.findFirst({
    where: eq(memberSubscriptions.id, purchase.memberSubscriptionId),
    columns: { status: true, cancelAt: true },
  });
  if (addonNotCollectible(purchase, bundle, subscription)) return null;
  const jobs: SubscriptionAddonSettlement = {
    purchaseId: purchase.id, subscriptionId: purchase.memberSubscriptionId,
    bundlePurchaseId: purchase.bundlePurchaseId, runAt: null,
  };
  if (outcome.status === "failed") {
    await tx.update(memberSubscriptionAddons).set({ status: "past_due", nextBillAt: null, updated: new Date() })
      .where(eq(memberSubscriptionAddons.id, purchase.id));
    return jobs;
  }
  if (outcome.status !== "succeeded") return null;
  if (!invoice.paid || invoice.status !== "paid") throw new Error(`Invoice ${invoice.id} has not been collected`);
  // An old payment replay must never move access back to an earlier cycle.
  if (purchase.paidPeriodStartsAt && purchase.paidPeriodStartsAt > invoice.forPeriodStart) {
    return { ...jobs, runAt: purchase.nextBillAt };
  }
  await tx.update(memberSubscriptionAddons).set({
    status: "active", paidPeriodStartsAt: invoice.forPeriodStart,
    paidPeriodEndsAt: invoice.forPeriodEnd, nextBillAt: invoice.forPeriodEnd, updated: new Date(),
  }).where(eq(memberSubscriptionAddons.id, purchase.id));
  return { ...jobs, runAt: invoice.forPeriodEnd };
}
