import { strict as assert } from "node:assert";
import { eq } from "drizzle-orm";
import { db, type DbTransaction } from "@/db/db";
import { enqueueAddonJob } from "@/queues";
import { bundlePurchases, memberSubscriptionAddons } from "@/subtrees/schemas";
import { addonPeriodEnd, hasEnded } from "@/subtrees/utils/addonsBundles";
import { settleAddonInvoice, type AddonSettlement } from "@/subtrees/utils/server/addonInvoices";
import { hasSubscriptionConflict } from "@/subtrees/utils/server/addonPricing";
import { lockBundle } from "@/subtrees/utils/server/bundlePayments";
import { reconcileBundle } from "./checkout/settlement";

// The add-on side of marking a cash invoice paid. The route calls these at fixed points.

type Invoice = { id: string; memberSubscriptionAddonId: string | null; forPeriodStart: Date | null; forPeriodEnd: Date | null };
type AddonPurchase = typeof memberSubscriptionAddons.$inferSelect;
type PaidInvoice = Parameters<typeof settleAddonInvoice>[1];

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
  if (await hasSubscriptionConflict(db, addon.memberSubscriptionId, invoice.forPeriodStart ?? new Date())) {
    return "This add-on would apply a conflicting subscription price";
  }
  return null;
}

/** Locks a bundled add-on's bundle in cancellation's order. False when the
 * bundle has ended; true for every other invoice. */
export async function lockOpenBundle(tx: DbTransaction, addon: AddonPurchase | undefined) {
  if (!addon?.bundlePurchaseId) return true;

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

/** Activates the paid period and returns the jobs to run after commit. A bundled
 * add-on settles like a gateway payment; a standalone add-on activates the
 * invoice's period directly. Null for invoices without an add-on. */
export async function settleMarkedAddon(tx: DbTransaction, paidInvoice: PaidInvoice, addon: AddonPurchase | null): Promise<AddonSettlement | null> {
  if (!addon) return null;
  if (!addon.bundlePurchaseId) return activateStandalone(tx, paidInvoice, addon);

  return settleAddonInvoice(tx, paidInvoice, { status: "succeeded" });
}

async function activateStandalone(tx: DbTransaction, invoice: Invoice, purchase: AddonPurchase): Promise<AddonSettlement> {
  const addon = await tx.query.addons.findFirst({ where: (row, { eq }) => eq(row.id, purchase.addonId) });
  assert(addon, "Add-on not found");

  // An invoice without a stored period end gets one from the add-on's interval.
  const periodStart = invoice.forPeriodStart ?? new Date();
  const periodEnd = addon.billingType === "recurring" ? invoice.forPeriodEnd ?? addonPeriodEnd(addon, periodStart) : null;
  await tx.update(memberSubscriptionAddons).set({
    status: "active", paidPeriodStartsAt: periodStart, paidPeriodEndsAt: periodEnd,
    nextBillAt: periodEnd, updated: new Date(),
  }).where(eq(memberSubscriptionAddons.id, purchase.id));
  return { purchaseId: purchase.id, bundlePurchaseId: null, runAt: periodEnd };
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
