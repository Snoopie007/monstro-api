import { db } from "@/db/db";
import {
  bundlePurchases,
  memberInvoices,
  memberSubscriptionAddons,
  memberSubscriptions,
  transactions,
} from "@/subtrees/schemas";
import type { InvoiceItem } from "@/subtrees/types";
import { invoiceItemSchema } from "@/subtrees/utils/invoiceItems";
import { readSubscriptionInvoice } from "@/subtrees/utils/server/subscriptionInvoices";
import { and, asc, eq, gte, inArray, isNull, lte, or } from "drizzle-orm";
import { z } from "zod";
import type { CanceledBundle } from "../cancellation";

type Invoice = typeof memberInvoices.$inferSelect;

export type BundleRefundCharge = {
  transaction: typeof transactions.$inferSelect;
  invoice: Invoice;
  total: number;
  items: InvoiceItem[];
  attributionError?: string;
};

const sourceProbe = z.object({ sourceId: z.string().optional() });

function invoiceReferencesBundle(invoice: Invoice, subscriptionIds: Set<string>, addonIds: Set<string>) {
  if (invoice.memberSubscriptionAddonId) return addonIds.has(invoice.memberSubscriptionAddonId);

  if (invoice.memberPlanId) return subscriptionIds.has(invoice.memberPlanId);

  return (invoice.items ?? []).some((item) => {
    const sourceId = sourceProbe.safeParse(item).data?.sourceId;

    return !!sourceId && (subscriptionIds.has(sourceId) || addonIds.has(sourceId));
  });
}

/** Scalar links are authoritative. Attributed lines are used only for combined
 * invoices, so an add-on's scalar parent subscription cannot claim its charge. */
function attributedCharge(invoice: Invoice, subscriptionIds: Set<string>, addonIds: Set<string>) {
  if (invoice.memberSubscriptionAddonId) {
    return addonIds.has(invoice.memberSubscriptionAddonId) ? { total: invoice.total, items: invoice.items ?? [] } : null;
  }

  if (invoice.memberPlanId) {
    return subscriptionIds.has(invoice.memberPlanId) ? { total: invoice.total, items: invoice.items ?? [] } : null;
  }

  let total = 0;
  const items: InvoiceItem[] = [];

  for (const subscriptionId of subscriptionIds) {
    const billing = readSubscriptionInvoice(invoice, subscriptionId);

    if (billing) total += billing.periods.reduce((sum, period) => sum + period.total, 0);
  }

  for (const raw of invoice.items ?? []) {
    const item = invoiceItemSchema.parse(raw);
    const ownedSubscription = item.sourceType === "subscription" && subscriptionIds.has(item.sourceId);
    const ownedAddon = item.sourceType === "subscription_addon" && addonIds.has(item.sourceId);

    if (!ownedSubscription && !ownedAddon) continue;

    if (!item.billing) throw new Error(`Invoice ${invoice.id} has no billed amount for a bundled item`);

    if (ownedAddon) total += item.billing.total;

    items.push(item);
  }

  return items.length > 0 ? { total, items } : null;
}

/** The invoice must be created between the purchase and the bundle's end. A
 * legacy subscription attached to a new bundle can retain an older initial
 * invoice. Charge time is not compared: cash marked paid is dated noon of the
 * paid day, which can fall before the purchase. */
export async function getRefundCharges(locationId: string, bundle: CanceledBundle): Promise<BundleRefundCharge[]> {
  const purchase = bundle.purchase;
  const candidates = await db.select({ transaction: transactions, invoice: memberInvoices }).from(transactions)
    .innerJoin(memberInvoices, eq(memberInvoices.transactionId, transactions.id))
    .where(and(
      eq(transactions.locationId, locationId),
      eq(transactions.memberId, purchase.memberId),
      eq(memberInvoices.locationId, locationId),
      eq(memberInvoices.memberId, purchase.memberId),
      eq(transactions.type, "inbound"),
      eq(transactions.status, "paid"),
      or(
        purchase.invoiceId ? eq(memberInvoices.id, purchase.invoiceId) : undefined,
        and(
          gte(memberInvoices.created, purchase.created),
          // A bundle already ended by a plain cancel keeps its subscriptions at full
          // price; their later renewals are not the bundle's to refund.
          purchase.endedAt ? lte(memberInvoices.created, purchase.endedAt) : undefined,
        ),
      ),
    )).orderBy(asc(transactions.chargeDate), asc(transactions.id));
  const subscriptionIds = new Set(bundle.subscriptionIds);
  const addonIds = new Set(bundle.addonPurchaseIds);
  const charges: BundleRefundCharge[] = [];

  for (const candidate of candidates) {
    if (candidate.transaction.total <= 0) continue;

    const original = candidate.invoice.id === purchase.invoiceId;

    if (!original && !invoiceReferencesBundle(candidate.invoice, subscriptionIds, addonIds)) continue;

    try {
      const scope = original
        ? { total: candidate.invoice.total, items: candidate.invoice.items ?? [] }
        : attributedCharge(candidate.invoice, subscriptionIds, addonIds);

      if (!scope || scope.total <= 0) continue;

      charges.push({ ...candidate, total: Math.min(candidate.transaction.total, scope.total), items: scope.items });
    } catch (error) {
      // Invalid matching attribution blocks this charge only. Other owned
      // charges can still be canceled/refunded without guessing its amount.
      console.error("Bundle refund could not read a charge's line attribution", { transactionId: candidate.transaction.id, error });
      charges.push({
        ...candidate,
        total: candidate.transaction.total,
        items: [],
        attributionError: "The bundle's amount on this charge could not be read. Staff must check it before refunding.",
      });
    }
  }

  return charges;
}

/** Used by legacy refund routes to direct owned charges to their one workflow.
 * It intentionally excludes invoices made before a legacy subscription joined
 * or after the bundle ended, matching getRefundCharges. */
export async function findBundleChargeOwner(locationId: string, transactionId: string) {
  const [charge] = await db.select({ transaction: transactions, invoice: memberInvoices }).from(transactions)
    .innerJoin(memberInvoices, eq(memberInvoices.transactionId, transactions.id))
    .where(and(eq(transactions.id, transactionId), eq(transactions.locationId, locationId))).limit(1);

  if (!charge) return null;

  const original = await db.query.bundlePurchases.findFirst({
    where: eq(bundlePurchases.invoiceId, charge.invoice.id),
    columns: { id: true, bundleId: true },
  });

  if (original) return original;

  const subscriptionIds: string[] = [];
  const addonIds: string[] = [];

  if (charge.invoice.memberSubscriptionAddonId) {
    addonIds.push(charge.invoice.memberSubscriptionAddonId);
  } else if (charge.invoice.memberPlanId) {
    subscriptionIds.push(charge.invoice.memberPlanId);
  } else {
    for (const raw of charge.invoice.items ?? []) {
      // Every refund passes through here; a line in an older shape is not a bundle's.
      const item = invoiceItemSchema.safeParse(raw).data;

      if (!item) continue;

      if (item.sourceType === "subscription") subscriptionIds.push(item.sourceId);

      if (item.sourceType === "subscription_addon") addonIds.push(item.sourceId);
    }
  }

  const [subscriptions, addons] = await Promise.all([
    subscriptionIds.length === 0 ? [] : db.select({ purchaseId: memberSubscriptions.bundlePurchaseId })
      .from(memberSubscriptions).where(inArray(memberSubscriptions.id, subscriptionIds)),
    addonIds.length === 0 ? [] : db.select({ purchaseId: memberSubscriptionAddons.bundlePurchaseId })
      .from(memberSubscriptionAddons).where(inArray(memberSubscriptionAddons.id, addonIds)),
  ]);
  const purchaseIds = [...subscriptions, ...addons].flatMap((owner) => owner.purchaseId ? [owner.purchaseId] : []);

  if (purchaseIds.length === 0) return null;

  const [owner] = await db.select({ id: bundlePurchases.id, bundleId: bundlePurchases.bundleId }).from(bundlePurchases)
    .where(and(
      inArray(bundlePurchases.id, purchaseIds),
      eq(bundlePurchases.memberId, charge.invoice.memberId),
      lte(bundlePurchases.created, charge.invoice.created),
      // A renewal after a plain cancel is the subscription's own, refunded the normal way.
      or(isNull(bundlePurchases.endedAt), gte(bundlePurchases.endedAt, charge.invoice.created)),
    )).limit(1);

  return owner ?? null;
}
