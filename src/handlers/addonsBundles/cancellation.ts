import { db } from "@/db/db";
import { removeRenewalJobs, removeSubscriptionAddonJobs } from "@/queues";
import {
  bundlePurchases,
  bundles,
  memberInvoices,
  memberLocations,
  memberPackages,
  memberSubscriptionAddons,
  memberSubscriptions,
} from "@/subtrees/schemas";
import { and, asc, eq, gt, inArray, isNull, or, sql } from "drizzle-orm";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

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

async function cancelMemberWithoutAccess(tx: Transaction, locationId: string, memberId: string, now: Date) {
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
export async function cancelBundlePurchase(locationId: string, bundlePurchaseId: string, reason?: string, expectedBundleId?: string) {
  return db.transaction(async (tx) => {
    await tx.execute(sql`
      select ${bundlePurchases.id}
      from ${bundlePurchases}
      inner join ${bundles} on ${bundles.id} = ${bundlePurchases.bundleId}
      where ${bundlePurchases.id} = ${bundlePurchaseId}
        and ${bundles.locationId} = ${locationId}
      for update
    `);
    const purchase = await tx.query.bundlePurchases.findFirst({
      where: eq(bundlePurchases.id, bundlePurchaseId),
      with: { bundle: { columns: { locationId: true } } },
    });
    if (!purchase || purchase.bundle?.locationId !== locationId || (expectedBundleId && purchase.bundleId !== expectedBundleId)) return { status: "not-found" as const };
    if (purchase.status === "canceled" || purchase.status === "expired") {
      return { status: "unchanged" as const, addonPurchaseIds: [] };
    }

    const now = new Date();
    const addonRows = await tx.select({ id: memberSubscriptionAddons.id })
      .from(memberSubscriptionAddons)
      .where(eq(memberSubscriptionAddons.bundlePurchaseId, bundlePurchaseId));
    const addonPurchaseIds = addonRows.map((addon) => addon.id);
    await tx.update(bundlePurchases).set({
      status: "canceled",
      endedAt: now,
      cancelReason: reason?.trim() || null,
      updated: now,
    }).where(eq(bundlePurchases.id, bundlePurchaseId));
    if (addonPurchaseIds.length > 0) {
      await tx.update(memberSubscriptionAddons).set({
        status: "canceled",
        cancelAt: now,
        canceledAt: now,
        endedAt: now,
        nextBillAt: null,
        updated: now,
      }).where(and(
        inArray(memberSubscriptionAddons.id, addonPurchaseIds),
        inArray(memberSubscriptionAddons.status, ["pending", "active", "past_due"]),
      ));
      await tx.update(memberInvoices).set({ status: "void", updated: now }).where(and(
        inArray(memberInvoices.memberSubscriptionAddonId, addonPurchaseIds),
        inArray(memberInvoices.status, ["draft", "sent", "unpaid"]),
      ));
    }
    return { status: "canceled" as const, addonPurchaseIds };
  });
}

/** Cancellation commits before refunds. Replays still cancel any component
 * that a late payment callback may have touched, and return all job IDs. */
export async function cancelBundleForRefund(input: BundleRefundInput): Promise<CanceledBundle | null> {
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
      // Legacy purchases can start in the future. Respect their date constraint.
      endedAt: purchase.endedAt ?? new Date(Math.max(now.getTime(), purchase.startsAt.getTime())),
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
async function voidUnpaidBundleInvoices(bundle: CanceledBundle) {
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
export async function finishBundleCancellation(bundle: CanceledBundle) {
  const cleanup = await Promise.allSettled([
    voidUnpaidBundleInvoices(bundle),
    ...bundle.subscriptionIds.map((id) => removeRenewalJobs(id)),
    ...bundle.addonPurchaseIds.map((id) => removeSubscriptionAddonJobs(id)),
  ]);
  const failed = cleanup.some((result) => result.status === "rejected");

  return failed ? ["Some unpaid invoices could not be voided or scheduled payments removed. Try again to finish cancellation."] : [];
}
