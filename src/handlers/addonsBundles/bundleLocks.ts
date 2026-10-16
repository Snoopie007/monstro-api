import type { DbTransaction } from "@/db/db";
import { bundlePurchases, memberSubscriptionAddons, memberSubscriptions } from "@/subtrees/schemas";
import { asc, eq } from "drizzle-orm";

/** Locks a bundle and its components in the order payment collection uses:
 * purchase, root subscriptions, then add-ons. */
export async function lockBundleComponents(tx: DbTransaction, bundlePurchaseId: string) {
  await tx.select({ id: bundlePurchases.id }).from(bundlePurchases)
    .where(eq(bundlePurchases.id, bundlePurchaseId)).for("update");
  await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions)
    .where(eq(memberSubscriptions.bundlePurchaseId, bundlePurchaseId))
    .orderBy(asc(memberSubscriptions.id)).for("update");
  await tx.select({ id: memberSubscriptionAddons.id }).from(memberSubscriptionAddons)
    .where(eq(memberSubscriptionAddons.bundlePurchaseId, bundlePurchaseId))
    .orderBy(asc(memberSubscriptionAddons.id)).for("update");
}
