import { eq } from "drizzle-orm";
import { db, type DbTransaction } from "@/db/db";
import { enqueueAddonJob } from "@/queues";
import { bundlePurchases, memberSubscriptionAddons } from "@/subtrees/schemas";
import { hasEnded } from "@/subtrees/utils/addonsBundles";
import type { AddonSettlement } from "@/subtrees/utils/server/addonInvoices";
import { hasSubscriptionConflict } from "@/subtrees/utils/server/addonPricing";
import { lockBundle, lockStandaloneAddon } from "@/subtrees/utils/server/bundlePayments";
import { reconcileBundle } from "./checkout/settlement";

// The add-on side of marking a cash invoice paid. The route calls these at fixed points.

type Invoice = { id: string; memberSubscriptionAddonId: string | null };
type AddonPurchase = typeof memberSubscriptionAddons.$inferSelect;

/** The add-on purchase an invoice pays for, read without locks. Undefined for other invoices. */
export async function getInvoiceAddon(invoice: Invoice) {
  if (!invoice.memberSubscriptionAddonId) return undefined;
  return db.query.memberSubscriptionAddons.findFirst({ where: eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId) });
}

/** Why an add-on invoice can't be marked paid, or null when it can. Other invoices return null. */
export async function markPaidBlocker(invoice: Invoice, addon: AddonPurchase | undefined) {
  if (!invoice.memberSubscriptionAddonId) return null;
  if (!addon || hasEnded(addon.status)) return "Canceled or expired add-on invoices cannot be marked paid";

  // Paying the add-on would switch its subscription to a price another add-on also sets.
  if (await hasSubscriptionConflict(db, addon.memberSubscriptionId)) {
    return "This add-on would apply a conflicting subscription price";
  }
  return null;
}

/** Locks an add-on invoice's owner before its invoice, in the order billing and
 * cancellation use: a bundled add-on's bundle, or a standalone add-on's
 * subscription and add-on. False when the bundle has ended; true for every other invoice. */
export async function lockAddonOwner(tx: DbTransaction, addon: AddonPurchase | undefined) {
  if (!addon) return true;
  if (!addon.bundlePurchaseId) {
    await lockStandaloneAddon(tx, addon.memberSubscriptionId, addon.id);
    return true;
  }

  await lockBundle(tx, addon.bundlePurchaseId);
  const bundle = await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.id, addon.bundlePurchaseId), columns: { status: true } });
  return Boolean(bundle && !hasEnded(bundle.status));
}

/** Locks the invoice's add-on purchase. "ended" when it was canceled, expired or moved
 * to another bundle since it was first read; null for other invoices. */
export async function lockInvoiceAddon(tx: DbTransaction, invoice: Invoice, discovered: AddonPurchase | undefined) {
  if (!invoice.memberSubscriptionAddonId) return null;

  const [addon] = await tx.select().from(memberSubscriptionAddons)
    .where(eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId)).for("update");
  if (!addon || hasEnded(addon.status) || addon.bundlePurchaseId !== (discovered?.bundlePurchaseId ?? null)) return "ended";
  return addon;
}

/** Schedules the renewal and reconciles the bundle. The payment already committed,
 * so a failure here is logged instead of failing the request. */
export async function runAddonFollowUp(locationId: string, followUp: AddonSettlement | null) {
  if (!followUp) return;
  const { purchaseId, runAt, bundlePurchaseId } = followUp;
  if (runAt) {
    await enqueueAddonJob("renew", purchaseId, runAt).catch((error) => {
      console.error("Add-on was paid but its renewal job could not be scheduled", { purchaseId, error });
    });
  }
  if (bundlePurchaseId) {
    await reconcileBundle(locationId, bundlePurchaseId).catch((error) => {
      console.error("Add-on was paid but its bundle could not be reconciled", { bundlePurchaseId, error });
    });
  }
}
