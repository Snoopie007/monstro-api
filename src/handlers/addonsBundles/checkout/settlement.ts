import { bundleCheckoutSchema } from "./checkoutFacts";
import { db, type DbTransaction } from "@/db/db";
import { enqueueAddonJob, enqueueAddonRetry, scheduleRenewalRepair } from "@/queues";
import {
  bundlePurchases,
  bundles,
  memberInvoices,
  memberSubscriptionAddons,
} from "@/subtrees/schemas";
import { hasEnded, OPEN_ADDON_PURCHASE_STATUSES } from "@/subtrees/utils/addonsBundles";
import type { BundlePaymentState } from "@/subtrees/types";
import { addonBillingPeriod } from "@/subtrees/utils/invoiceItems";
import { attemptSchema, collectPayment, findInvoiceOwner, recordPayment, type InvoicePaymentOwner, type InvoicePaymentRecord } from "@/subtrees/utils/server/bundlePayments";
import { settleAddonInvoice, type AddonSettlement } from "@/subtrees/utils/server/addonInvoices";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { hasAddonConflict } from "@/subtrees/utils/server/addonPricing";
import { markSubscriptionActivated } from "@/routes/x/loc/subscriptions/activation";

type Invoice = typeof memberInvoices.$inferSelect;

const bundleInvoiceMetadataSchema = z.looseObject({
  gatewayService: z.enum(["stripe", "square", "authorize"]),
  gatewayIntegrationId: z.string(),
  // The collector's attempt, in the same shape it writes.
  billingAttempt: attemptSchema.optional(),
});

/** The gateway binding and current billing attempt of a bundle invoice. */
export function getBundleBinding(metadata: Invoice["metadata"]) {
  return bundleInvoiceMetadataSchema.parse(metadata ?? {});
}

/** True when a bundle owns this invoice: its checkout invoice or a bundled add-on's period. */
export async function isBundleInvoice(invoiceId: string) {
  return Boolean((await findInvoiceOwner(db, invoiceId))?.purchaseId);
}

/** True when the shared collector charges this invoice: a bundle checkout or
 * any add-on period, bundled or standalone. Gateway webhooks route these to it. */
export async function isCollectorInvoice(invoiceId: string) {
  return (await findInvoiceOwner(db, invoiceId)) !== null;
}

export function bundlePaymentState(invoice: Pick<Invoice, "paid" | "metadata">): BundlePaymentState {
  if (invoice.paid) return "active";

  // A declined attempt can be paid again; any other attempt is still settling.
  return getBundleBinding(invoice.metadata).billingAttempt?.status === "failed" ? "declined" : "processing";
}

type BundleJobs = {
  locationId: string;
  subscriptions: Array<{ id: string; dueAt: Date }>;
  addonRenewals: Array<{ addonPurchaseId: string; runAt: Date }>;
};

/** Activates everything a paid bundle invoice bought. Runs in the transaction
 * that marked the invoice paid; returns the jobs to schedule after it commits. */
async function activateBundle(
  tx: DbTransaction,
  invoice: Pick<Invoice, "id" | "locationId" | "items" | "metadata">,
): Promise<BundleJobs> {
  const [locked] = await tx.select({ id: bundlePurchases.id }).from(bundlePurchases)
    .where(eq(bundlePurchases.invoiceId, invoice.id)).for("update");
  const purchase = locked && await tx.query.bundlePurchases.findFirst({
    where: eq(bundlePurchases.id, locked.id),
    columns: { id: true, status: true },
    with: {
      subscriptions: {
        columns: { id: true, memberId: true, metadata: true, currentPeriodEnd: true },
      },
      addonPurchases: { columns: { id: true, status: true } },
    },
  });

  if (!purchase) throw new Error(`Invoice ${invoice.id} does not belong to a bundle purchase`);

  // A purchase canceled while its payment settled keeps the payment for support to refund.
  if (hasEnded(purchase.status)) return { locationId: invoice.locationId, subscriptions: [], addonRenewals: [] };
  if (purchase.status === "active") {
    const addonRenewals: BundleJobs["addonRenewals"] = [];
    for (const addon of purchase.addonPurchases) {
      if (addon.status !== "active") continue;
      const { forPeriodEnd } = addonBillingPeriod(invoice.items, addon.id);
      if (forPeriodEnd) addonRenewals.push({ addonPurchaseId: addon.id, runAt: forPeriodEnd });
    }
    return { locationId: invoice.locationId, subscriptions: purchase.subscriptions.map(sub => ({ id: sub.id, dueAt: sub.currentPeriodEnd })), addonRenewals };
  }

  const { gatewayService, billingAttempt: attempt } = getBundleBinding(invoice.metadata);

  if (!attempt) throw new Error(`Invoice ${invoice.id} was paid without a billing attempt`);

  const now = new Date();
  const addonRenewals: BundleJobs["addonRenewals"] = [];

  for (const subscription of purchase.subscriptions) {
    // Creating the bundle invoice saved whether each first charge was a downpayment.
    const { initialDownpayment } = bundleCheckoutSchema.required({ initialDownpayment: true })
      .parse(subscription.metadata.bundleCheckout);

    await markSubscriptionActivated(tx, {
      subscription: {
        id: subscription.id,
        memberId: subscription.memberId,
        locationId: invoice.locationId,
        metadata: subscription.metadata,
      },
      payment: {
        paymentMethodId: attempt.paymentMethodId,
        gatewayService,
        gatewayIntegrationId: attempt.gatewayIntegrationId,
        gatewayCustomerId: attempt.gatewayCustomerId,
      },
      paidDownpayment: initialDownpayment,
      finalized: true,
    });
  }

  for (const addonPurchase of purchase.addonPurchases) {
    if (addonPurchase.status !== "pending") continue;

    const { forPeriodStart, forPeriodEnd } = addonBillingPeriod(invoice.items, addonPurchase.id);

    await tx.update(memberSubscriptionAddons).set({
      status: "active",
      paidPeriodStartsAt: forPeriodStart,
      paidPeriodEndsAt: forPeriodEnd,
      nextBillAt: forPeriodEnd,
      updated: now,
    }).where(eq(memberSubscriptionAddons.id, addonPurchase.id));

    if (forPeriodEnd) addonRenewals.push({ addonPurchaseId: addonPurchase.id, runAt: forPeriodEnd });
  }

  await tx.update(bundlePurchases).set({ status: "active", updated: now }).where(eq(bundlePurchases.id, purchase.id));

  return {
    locationId: invoice.locationId,
    subscriptions: purchase.subscriptions.map((subscription) => ({ id: subscription.id, dueAt: subscription.currentPeriodEnd })),
    addonRenewals,
  };
}

async function scheduleBundleJobs(jobs: BundleJobs) {
  for (const subscription of jobs.subscriptions) {
    await scheduleRenewalRepair(subscription.id, jobs.locationId, subscription.dueAt);
  }

  for (const renewal of jobs.addonRenewals) {
    await enqueueAddonJob("renew", renewal.addonPurchaseId, renewal.runAt);
  }
}

/** Activates a pending bundle once its separately paid subscriptions and
 * required add-ons are ready. Settling a bundled add-on invoice calls this
 * without starting add-ons; every other caller uses reconcileBundle. */
async function activateWhenReady(locationId: string, bundlePurchaseId: string) {
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
      with: {
        bundle: {
          columns: { locationId: true },
          with: { components: { columns: { id: true, addonId: true, required: true } } },
        },
        subscriptions: { columns: { id: true, memberPlanPricingId: true, status: true, paymentType: true, gatewayPaymentId: true } },
        addonPurchases: { columns: { id: true, status: true, bundleComponentId: true } },
      },
    });

    if (!purchase || purchase.bundle?.locationId !== locationId) return { status: "not-found" as const };

    if (hasEnded(purchase.status)) {
      return { status: "inactive" as const };
    }

    const subscriptionPaid = (subscription: typeof purchase.subscriptions[number]) =>
      ["active", "trialing"].includes(subscription.status)
      && (subscription.paymentType === "cash" || !!subscription.gatewayPaymentId);

    if (!purchase.subscriptions.every(subscriptionPaid)) return { status: "subscriptions-not-ready" as const };

    const subscriptionIds = purchase.subscriptions.map((subscription) => subscription.id);
    const openAddonPurchases = subscriptionIds.length === 0 ? [] : await tx.select({
      memberSubscriptionId: memberSubscriptionAddons.memberSubscriptionId,
      addonId: memberSubscriptionAddons.addonId,
    }).from(memberSubscriptionAddons).where(and(
      inArray(memberSubscriptionAddons.memberSubscriptionId, subscriptionIds),
      inArray(memberSubscriptionAddons.status, [...OPEN_ADDON_PURCHASE_STATUSES]),
    ));
    const addonsBySubscription = Map.groupBy(openAddonPurchases, (addon) => addon.memberSubscriptionId);

    const pricedSubscriptions: Array<{ id: string; pricingId: string }> = [];

    for (const subscription of purchase.subscriptions) {
      if (!subscription.memberPlanPricingId) return { status: "subscriptions-not-ready" as const };

      pricedSubscriptions.push({ id: subscription.id, pricingId: subscription.memberPlanPricingId });
    }

    const pricingConflicts = await Promise.all(pricedSubscriptions.map((subscription) =>
      hasAddonConflict(
        tx,
        subscription.pricingId,
        (addonsBySubscription.get(subscription.id) ?? []).map((addon) => addon.addonId),
        new Date(),
      )
    ));

    if (pricingConflicts.some(Boolean)) return { status: "pricing-conflict" as const };

    // The bundle is active once every required add-on is paid.
    const requiredAddonsReady = (purchase.bundle?.components ?? [])
      .filter((component) => component.addonId && component.required)
      .every((component) => purchase.addonPurchases.some((addon) => addon.bundleComponentId === component.id && addon.status === "active"));

    if (requiredAddonsReady) {
      await tx.update(bundlePurchases).set({ status: "active", updated: new Date() })
        .where(eq(bundlePurchases.id, bundlePurchaseId));
    }

    return {
      status: "ready" as const,
      addonPurchaseIds: purchase.addonPurchases.flatMap((addon) => addon.status === "pending" ? [addon.id] : []),
    };
  });
}

/** Reconciles a bundle whose components were paid separately, then starts
 * activation for its pending add-ons once it is ready. */
export async function reconcileBundle(locationId: string, bundlePurchaseId: string) {
  const reconciliation = await activateWhenReady(locationId, bundlePurchaseId);

  if (reconciliation.status === "ready") {
    await Promise.all(reconciliation.addonPurchaseIds.map((addonPurchaseId) =>
      enqueueAddonJob("activate", addonPurchaseId)
    ));
  }

  return reconciliation;
}

type PaymentJobs = {
  bundle?: BundleJobs;
  addon?: AddonSettlement | null;
  locationId: string;
  declined: boolean;
  invoiceId: string;
};

const paymentOwner: InvoicePaymentOwner<PaymentJobs> = {
  async settle(tx, invoice, outcome) {
    if (invoice.memberSubscriptionAddonId) {
      return { addon: await settleAddonInvoice(tx, invoice, outcome), locationId: invoice.locationId, invoiceId: invoice.id, declined: outcome.status === "failed" };
    }
    return { bundle: outcome.status === "succeeded" ? await activateBundle(tx, invoice) : undefined, locationId: invoice.locationId, invoiceId: invoice.id, declined: false };
  },
  async schedule(jobs) {
    if (jobs.bundle) await scheduleBundleJobs(jobs.bundle);
    if (!jobs.addon) return;
    if (jobs.declined) {
      await enqueueAddonRetry({ memberSubscriptionAddonId: jobs.addon.purchaseId, invoiceId: jobs.invoiceId });
      return;
    }
    if (jobs.addon.runAt) await enqueueAddonJob("renew", jobs.addon.purchaseId, jobs.addon.runAt);
    if (jobs.addon.bundlePurchaseId) await activateWhenReady(jobs.locationId, jobs.addon.bundlePurchaseId);
  },
};

/** Response and webhook use the same financial recorder, including bundled add-ons. */
export function recordBundlePayment(record: InvoicePaymentRecord) {
  return recordPayment(db, record, paymentOwner);
}

export function collectBundlePayment(
  input: Parameters<typeof collectPayment>[1],
  charge: Parameters<typeof collectPayment>[2],
) {
  return collectPayment(db, input, charge, paymentOwner);
}
