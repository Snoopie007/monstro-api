import { db, type DbTransaction } from "@/db/db";
import { removeRenewalJobs, removeAddonJobs } from "@/queues";
import {
  bundlePurchases,
  bundles,
  memberInvoices,
  memberLocations,
  memberPackages,
  memberSubscriptionAddons,
  memberSubscriptions,
} from "@/subtrees/schemas";
import { hasEnded } from "@/subtrees/utils/addonsBundles";
import { endBundle } from "@/subtrees/utils/server/addonInvoices";
import { and, asc, eq, gt, inArray, isNull, or } from "drizzle-orm";


export type BundleRefundInput = {
  locationId: string;
  bundleId: string;
  purchaseId: string;
  reason?: string;
};

export type CanceledBundle = {
  purchase: typeof bundlePurchases.$inferSelect;
  subscriptionIds: string[];
  addonPurchaseIds: string[];
};

async function cancelMemberWithoutAccess(tx: DbTransaction, locationId: string, memberId: string, now: Date) {
  await tx.select({ memberId: memberLocations.memberId }).from(memberLocations)
    .where(and(eq(memberLocations.locationId, locationId), eq(memberLocations.memberId, memberId)))
    .for("update");

  const [subscription] = await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions)
    .where(and(
      eq(memberSubscriptions.locationId, locationId),
      eq(memberSubscriptions.memberId, memberId),
      inArray(memberSubscriptions.status, ["active", "trialing", "past_due"]),
      or(isNull(memberSubscriptions.cancelAt), gt(memberSubscriptions.cancelAt, now)),
      or(isNull(memberSubscriptions.endedAt), gt(memberSubscriptions.endedAt, now)),
    )).limit(1);
  const [activePackage] = await tx.select({ id: memberPackages.id }).from(memberPackages)
    .where(and(
      eq(memberPackages.locationId, locationId),
      eq(memberPackages.memberId, memberId),
      eq(memberPackages.status, "active"),
      or(isNull(memberPackages.expireDate), gt(memberPackages.expireDate, now)),
    )).limit(1);

  if (subscription || activePackage) return;

  await tx.update(memberLocations).set({ status: "canceled", updated: now })
    .where(and(eq(memberLocations.locationId, locationId), eq(memberLocations.memberId, memberId)));
}

/** Ends a bundle without refunding it. Its subscriptions keep running; its
 * add-ons stop and their unpaid invoices are voided. */
export async function cancelBundle(locationId: string, bundlePurchaseId: string, reason?: string, expectedBundleId?: string) {
  return db.transaction(async (tx) => {
    // Locks the purchase and its bundle, scoped to the location.
    const [row] = await tx.select({ purchase: bundlePurchases }).from(bundlePurchases)
      .innerJoin(bundles, eq(bundles.id, bundlePurchases.bundleId))
      .where(and(eq(bundlePurchases.id, bundlePurchaseId), eq(bundles.locationId, locationId))).for("update");
    const purchase = row?.purchase;
    if (!purchase || (expectedBundleId && purchase.bundleId !== expectedBundleId)) return { status: "not-found" as const };
    if (hasEnded(purchase.status)) return { status: "unchanged" as const };

    await endBundle(tx, bundlePurchaseId, reason?.trim() || null);
    return { status: "canceled" as const };
  });
}

/** Cancellation commits before refunds. Replays still cancel any component
 * that a late payment callback may have touched, and return all job IDs. */
export async function cancelForRefund(input: BundleRefundInput): Promise<CanceledBundle | null> {
  return db.transaction(async (tx) => {
    const [row] = await tx.select({ purchase: bundlePurchases }).from(bundlePurchases)
      .innerJoin(bundles, eq(bundles.id, bundlePurchases.bundleId))
      .where(and(
        eq(bundlePurchases.id, input.purchaseId),
        eq(bundlePurchases.bundleId, input.bundleId),
        eq(bundles.locationId, input.locationId),
      )).for("update", { of: bundlePurchases });

    if (!row) return null;

    const purchase = row.purchase;
    const subscriptions = await tx.select().from(memberSubscriptions)
      .where(eq(memberSubscriptions.bundlePurchaseId, purchase.id)).orderBy(asc(memberSubscriptions.id)).for("update");
    const rootIds = subscriptions.map((subscription) => subscription.id);
    const children = rootIds.length === 0 ? [] : await tx.select().from(memberSubscriptions)
      .where(inArray(memberSubscriptions.parentId, rootIds)).orderBy(asc(memberSubscriptions.id)).for("update");
    const affectedSubscriptions = new Map([...subscriptions, ...children].map((subscription) => [subscription.id, subscription]));
    const subscriptionIds = [...affectedSubscriptions.keys()];
    const addonRows = await tx.select({ id: memberSubscriptionAddons.id }).from(memberSubscriptionAddons)
      .where(eq(memberSubscriptionAddons.bundlePurchaseId, purchase.id)).orderBy(asc(memberSubscriptionAddons.id)).for("update");
    const addonPurchaseIds = addonRows.map((addon) => addon.id);
    const now = new Date();

    await tx.update(bundlePurchases).set({
      status: "canceled",
      endedAt: purchase.endedAt ?? now,
      cancelReason: input.reason?.trim() || purchase.cancelReason,
      updated: now,
    }).where(eq(bundlePurchases.id, purchase.id));

    for (const subscription of affectedSubscriptions.values()) {
      await tx.update(memberSubscriptions).set({
        status: "canceled",
        cancelAt: now,
        endedAt: subscription.endedAt ?? now,
        cancelAtPeriodEnd: false,
        metadata: {
          ...subscription.metadata,
          cancellation: {
            reason: input.reason?.trim() || purchase.cancelReason,
            option: "now",
            processedAt: now.toISOString(),
            refund: { executed: false },
          },
        },
        updated: now,
      }).where(eq(memberSubscriptions.id, subscription.id));
    }

    if (addonPurchaseIds.length > 0) {
      await tx.update(memberSubscriptionAddons).set({
        status: "canceled",
        cancelAt: now,
        canceledAt: now,
        endedAt: now,
        nextBillAt: null,
        updated: now,
      }).where(inArray(memberSubscriptionAddons.id, addonPurchaseIds));
    }

    const memberIds = new Set([purchase.memberId, ...[...affectedSubscriptions.values()].map((subscription) => subscription.memberId)]);

    for (const memberId of [...memberIds].sort()) {
      await cancelMemberWithoutAccess(tx, input.locationId, memberId, now);
    }

    return { purchase, subscriptionIds, addonPurchaseIds };
  });
}

/** Invoice writes happen after the access transaction releases its locks.
 * Ordinary renewal callbacks lock an invoice before its access records; the
 * bundle collector locks access records first, as cancellation does. */
async function voidUnpaidInvoices(bundle: CanceledBundle) {
  const invoiceOwners = [];

  if (bundle.purchase.invoiceId) invoiceOwners.push(eq(memberInvoices.id, bundle.purchase.invoiceId));

  if (bundle.subscriptionIds.length > 0) invoiceOwners.push(inArray(memberInvoices.memberPlanId, bundle.subscriptionIds));

  if (bundle.addonPurchaseIds.length > 0) invoiceOwners.push(inArray(memberInvoices.memberSubscriptionAddonId, bundle.addonPurchaseIds));

  if (invoiceOwners.length === 0) return;

  await db.update(memberInvoices).set({ status: "void", updated: new Date() }).where(and(
    or(...invoiceOwners),
    eq(memberInvoices.paid, false),
    inArray(memberInvoices.status, ["draft", "sent", "unpaid"]),
  ));
}

/** Voids the canceled bundle's unpaid invoices and removes its scheduled jobs.
 * Both are retried with the refund request. Failed cleanup cannot stop the
 * independent refunds after cancellation has already committed. */
export async function finishCancellation(bundle: CanceledBundle) {
  const cleanup = await Promise.allSettled([
    voidUnpaidInvoices(bundle),
    ...bundle.subscriptionIds.map((id) => removeRenewalJobs(id)),
    ...bundle.addonPurchaseIds.map((id) => removeAddonJobs(id)),
  ]);
  const failed = cleanup.some((result) => result.status === "rejected");

  return failed ? ["Some unpaid invoices could not be voided or scheduled payments removed. Try again to finish cancellation."] : [];
}
