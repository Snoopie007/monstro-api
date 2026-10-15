import { asc, eq, inArray } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import * as schema from "../../schemas";
import type { PaymentType, SubscriptionBillingAttempt, TransactionMetadata } from "../../types";
import { addonNotCollectible, hasEnded } from "../addonsBundles";
import { dispatchPaymentFailed } from "./workflows";

const { bundlePurchases, memberSubscriptions, memberSubscriptionAddons, memberInvoices, transactions } = schema;
type Database = PostgresJsDatabase<typeof schema>;
export type InvoicePaymentTransaction = Parameters<Parameters<Database["transaction"]>[0]>[0];
export type PaymentInvoice = typeof memberInvoices.$inferSelect;
export type InvoiceGateway = {
  service: "stripe" | "square" | "authorize";
  integrationId: string;
  customerId: string;
  stripeAccountId?: string;
};
export type InvoicePaymentRequest = {
  invoiceId: string;
  attemptId: string;
  gateway: InvoiceGateway;
  paymentMethodId: string;
  paymentType: PaymentType;
  total: number;
  feesAmount: number;
  currency: string;
  description: string;
  referenceId: string;
  note: string;
  metadata: Record<string, string>;
};
export type InvoicePaymentOutcome = (
  | { status: "succeeded"; paymentIntentId: string; amount: number; currency: string }
  | { status: "failed"; paymentIntentId?: string; reason: string; code: string; retryable: boolean; workflowDecline: boolean }
  | { status: "processing" | "requires_action" | "unknown"; paymentIntentId?: string }
) & {
  gatewayMetadata?: TransactionMetadata;
  receiptUrl?: string | null;
  amount?: number;
  currency?: string;
  paymentType?: PaymentType;
  brand?: string;
  last4?: string;
};
export type InvoicePaymentRecord = InvoicePaymentOutcome & {
  invoiceId: string;
  attemptId?: string;
  gateway: { service: InvoiceGateway["service"]; integrationId?: string; stripeAccountId?: string | null; customerId?: string; paymentMethodId?: string };
};
export type InvoicePaymentOwner<Jobs> = {
  settle: (tx: InvoicePaymentTransaction, invoice: PaymentInvoice, outcome: InvoicePaymentOutcome) => Promise<Jobs>;
  schedule: (jobs: Jobs) => Promise<void>;
};

const attemptSchema = z.looseObject({
  id: z.string().min(1),
  status: z.enum(["in_flight", "succeeded", "failed", "processing", "requires_action", "unknown"]),
  startedAt: z.string(),
  gatewayIntegrationId: z.string(),
  gatewayCustomerId: z.string(),
  paymentMethodId: z.string(),
  paymentType: z.enum(["cash", "card", "us_bank_account", "paypal", "apple_pay", "google_pay", "link", "cashapp"]),
  paymentIntentId: z.string().optional(),
  stripeAccountId: z.string().optional(),
  retryable: z.boolean().optional(),
});
const requestSchema = z.object({
  total: z.number().int().nonnegative(),
  feesAmount: z.number().int().nonnegative(),
  currency: z.string().min(1),
  description: z.string(),
  referenceId: z.string(),
  note: z.string(),
  metadata: z.record(z.string(), z.string()),
});

function readAttempt(invoice: PaymentInvoice) {
  const value: unknown = invoice.metadata?.billingAttempt;
  return value == null ? null : attemptSchema.parse(value);
}

/** Discover without locks, then take the same order as cancellation. Reread the
 * invoice after the owner locks; nothing financial relies on the first read. */
async function lockPayment(tx: InvoicePaymentTransaction, invoiceId: string) {
  const discovered = await tx.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, invoiceId) });
  if (!discovered) throw new Error(`Invoice ${invoiceId} was not found`);
  const addon = discovered.memberSubscriptionAddonId
    ? await tx.query.memberSubscriptionAddons.findFirst({ where: eq(memberSubscriptionAddons.id, discovered.memberSubscriptionAddonId) })
    : undefined;
  const purchase = addon?.bundlePurchaseId
    ? await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.id, addon.bundlePurchaseId) })
    : await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.invoiceId, invoiceId) });
  if (!purchase) throw new Error(`Invoice ${invoiceId} has no bundle payment owner`);

  await tx.select({ id: bundlePurchases.id }).from(bundlePurchases).where(eq(bundlePurchases.id, purchase.id)).for("update");
  const roots = await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions)
    .where(eq(memberSubscriptions.bundlePurchaseId, purchase.id)).orderBy(asc(memberSubscriptions.id)).for("update");
  if (roots.length) await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions)
    .where(inArray(memberSubscriptions.parentId, roots.map(root => root.id))).orderBy(asc(memberSubscriptions.id)).for("update");
  await tx.select({ id: memberSubscriptionAddons.id }).from(memberSubscriptionAddons)
    .where(eq(memberSubscriptionAddons.bundlePurchaseId, purchase.id)).orderBy(asc(memberSubscriptionAddons.id)).for("update");
  const [invoice] = await tx.select().from(memberInvoices).where(eq(memberInvoices.id, invoiceId)).for("update");
  if (!invoice?.transactionId) throw new Error(`Invoice ${invoiceId} has no stored transaction`);
  const [transaction] = await tx.select().from(transactions).where(eq(transactions.id, invoice.transactionId)).for("update");
  if (!transaction) throw new Error(`Invoice ${invoiceId} has no stored transaction`);
  if (transaction.locationId !== invoice.locationId || transaction.memberId !== invoice.memberId
    || transaction.total !== invoice.total || transaction.currency.toUpperCase() !== invoice.currency?.toUpperCase()) {
    throw new Error(`Invoice ${invoiceId} does not match its stored transaction`);
  }
  const currentPurchase = await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.id, purchase.id) });
  const currentAddon = invoice.memberSubscriptionAddonId
    ? await tx.query.memberSubscriptionAddons.findFirst({ where: eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId) })
    : undefined;
  if (invoice.memberSubscriptionAddonId !== discovered.memberSubscriptionAddonId
    || (currentAddon ? currentAddon.bundlePurchaseId !== purchase.id : currentPurchase?.invoiceId !== invoice.id)) {
    throw new Error(`Invoice ${invoiceId}'s payment owner changed`);
  }
  const currentSubscription = currentAddon ? await tx.query.memberSubscriptions.findFirst({ where: eq(memberSubscriptions.id, currentAddon.memberSubscriptionId), columns: { memberId: true, locationId: true } }) : null;
  if (!currentPurchase || currentPurchase.memberId !== invoice.memberId || (currentAddon && (!currentSubscription || currentSubscription.memberId !== invoice.memberId || currentSubscription.locationId !== invoice.locationId))) {
    throw new Error(`Invoice ${invoiceId}'s payer does not match its owner`);
  }
  return { invoice, transaction, purchase: currentPurchase, addon: currentAddon };
}

function isRefunded(transaction: typeof transactions.$inferSelect, paymentIntentId?: string) {
  const refund = transaction.metadata.refund;
  return transaction.refunded || (refund?.status === "completed" && refund.paymentId === paymentIntentId);
}

function assertBinding(invoice: PaymentInvoice, attempt: SubscriptionBillingAttempt, gateway: InvoicePaymentRecord["gateway"]) {
  if (gateway.service !== invoice.metadata?.gatewayService
    || (gateway.integrationId !== undefined && gateway.integrationId !== attempt.gatewayIntegrationId)
    || (gateway.customerId !== undefined && gateway.customerId !== attempt.gatewayCustomerId)
    || (gateway.paymentMethodId !== undefined && gateway.paymentMethodId !== attempt.paymentMethodId)
    || (gateway.service === "stripe" && gateway.stripeAccountId !== attempt.stripeAccountId)) {
    throw new Error(`Payment gateway does not match invoice ${invoice.id}`);
  }
}

/** Records provider evidence and money in one transaction. The owner writes
 * access in that transaction and derives deterministic jobs for paid replays. */
export async function recordInvoicePayment<Jobs>(database: Database, input: InvoicePaymentRecord, owner: InvoicePaymentOwner<Jobs>) {
  const result = await database.transaction(async (tx) => {
    const { invoice, transaction } = await lockPayment(tx, input.invoiceId);
    const attempt = readAttempt(invoice);
    if (!attempt) throw new Error(`Invoice ${invoice.id} has no billing attempt`);
    const identified = input.attemptId === attempt.id
      || (input.attemptId === undefined && input.paymentIntentId !== undefined && input.paymentIntentId === attempt.paymentIntentId);
    if (!identified) {
      if (input.status === "succeeded") throw new Error(`Payment for invoice ${invoice.id} belongs to another attempt`);
      return { status: "ignored" as const };
    }
    assertBinding(invoice, attempt, input.gateway);
    if (attempt.paymentIntentId && input.paymentIntentId && attempt.paymentIntentId !== input.paymentIntentId) {
      throw new Error(`Payment does not match invoice ${invoice.id}'s billing attempt`);
    }
    if ((input.amount !== undefined && input.amount !== invoice.total) || (input.currency !== undefined && input.currency.toUpperCase() !== invoice.currency?.toUpperCase())) {
      throw new Error(`Payment amount or currency does not match invoice ${invoice.id}`);
    }
    if (isRefunded(transaction, input.paymentIntentId)) return { status: "refunded" as const };
    if (invoice.paid || invoice.status === "paid") {
      if (input.status !== "succeeded" || transaction.paymentIntentId !== input.paymentIntentId) return { status: "ignored" as const };
      return { status: "paid" as const, jobs: await owner.settle(tx, invoice, input) };
    }
    if ((attempt.status === "succeeded" && input.status !== "succeeded")
      || (attempt.status === "failed" && ["unknown", "processing", "requires_action"].includes(input.status))) {
      return { status: "ignored" as const };
    }
    if (attempt.status === "failed" && input.status === "failed") return { status: "ignored" as const };

    const now = new Date();
    const billingAttempt: SubscriptionBillingAttempt = {
      ...attempt,
      status: input.status,
    };
    if (input.paymentIntentId) billingAttempt.paymentIntentId = input.paymentIntentId;
    if (input.status === "failed") billingAttempt.retryable = input.retryable;

    const metadata: TransactionMetadata = { ...transaction.metadata, ...input.gatewayMetadata };
    if (input.brand && input.last4) {
      if ((input.paymentType ?? attempt.paymentType) === "us_bank_account") {
        metadata.us_bank_account = { bank_name: input.brand, last4: input.last4 };
      } else {
        metadata.card = { brand: input.brand, last4: input.last4 };
      }
    }
    if (transaction.metadata.refund) metadata.refund = transaction.metadata.refund;

    const [updated] = await tx.update(memberInvoices).set({
      status: input.status === "succeeded" ? "paid" : invoice.status === "void" ? "void" : "unpaid",
      paid: input.status === "succeeded",
      metadata: { ...invoice.metadata, billingAttempt },
      receiptUrl: input.receiptUrl || undefined,
      updated: now,
    }).where(eq(memberInvoices.id, invoice.id)).returning();
    await tx.update(transactions).set({
      status: input.status === "succeeded" ? "paid" : input.status === "failed" ? "failed" : "pending",
      paymentIntentId: input.paymentIntentId || undefined,
      failedReason: input.status === "failed" ? input.reason : null,
      failedCode: input.status === "failed" ? input.code : null,
      metadata,
      activities: [...transaction.activities, {
        reason: input.status === "succeeded" ? "Payment succeeded."
          : input.status === "failed" ? `Payment failed: ${input.reason}` : `Payment ${input.status}.`,
        at: now.toISOString(),
        paymentType: input.paymentType ?? attempt.paymentType,
        brand: input.brand,
        last4: input.last4,
      }],
      updated: now,
    }).where(eq(transactions.id, transaction.id));
    if (input.status === "failed" && input.workflowDecline) await dispatchPaymentFailed(tx, transaction.id);
    if (!updated) throw new Error(`Invoice ${invoice.id} disappeared during payment`);
    return { status: input.status, jobs: await owner.settle(tx, updated, input) };
  });
  if (result.jobs !== undefined) await owner.schedule(result.jobs);
  return result.status;
}

/** One stored invoice, one durable attempt. An uncertain or in-flight attempt
 * blocks collection indefinitely until conclusive provider evidence arrives. */
export async function collectInvoicePayment<Jobs>(database: Database, input: {
  invoiceId: string;
  gateway: InvoiceGateway;
  retry?: boolean;
  method?: { paymentMethodId: string; paymentType: PaymentType };
}, charge: (request: InvoicePaymentRequest) => Promise<InvoicePaymentOutcome>, owner: InvoicePaymentOwner<Jobs>) {
  const claim = await database.transaction(async (tx) => {
    const { invoice, transaction, purchase, addon } = await lockPayment(tx, input.invoiceId);
    const prior = readAttempt(invoice);
    if (isRefunded(transaction, transaction.paymentIntentId ?? undefined)) return { status: "refunded" as const };
    if (invoice.paid || invoice.status === "paid") {
      if (!prior?.paymentIntentId) throw new Error(`Paid invoice ${invoice.id} has no payment attempt`);
      return { status: "paid" as const, replay: { invoice, prior } };
    }
    if (invoice.status === "void" || !purchase || hasEnded(purchase.status) || (addon && hasEnded(addon.status))) {
      return { status: "inactive" as const };
    }
    if (addon) {
      const subscription = await tx.query.memberSubscriptions.findFirst({ where: eq(memberSubscriptions.id, addon.memberSubscriptionId) });
      if (addonNotCollectible(addon, purchase, subscription) || subscription?.bundlePurchaseId !== purchase.id) {
        return { status: "inactive" as const };
      }
    }
    if (prior && prior.status !== "failed") return { status: prior.status };
    if (prior?.status === "failed" && !input.retry) return { status: "failed" as const };
    const prepared = z.looseObject({
      gatewayIntegrationId: z.string(), gatewayCustomerId: z.string(), stripeAccountId: z.string().optional(),
    }).parse(transaction.metadata.billingAttempt ?? {
      gatewayIntegrationId: invoice.metadata?.gatewayIntegrationId,
      gatewayCustomerId: invoice.metadata?.gatewayCustomerId,
      stripeAccountId: prior?.stripeAccountId,
    });
    if (input.gateway.service !== invoice.metadata?.gatewayService
      || input.gateway.integrationId !== prepared.gatewayIntegrationId || input.gateway.customerId !== prepared.gatewayCustomerId
      || (input.gateway.service === "stripe" && prepared.stripeAccountId !== undefined && input.gateway.stripeAccountId !== prepared.stripeAccountId)) {
      throw new Error(`Invoice ${invoice.id}'s payment gateway or customer changed`);
    }
    const paymentMethodId = input.method?.paymentMethodId ?? transaction.paymentMethodId;
    if (!paymentMethodId) throw new Error(`Invoice ${invoice.id} has no saved payment method`);
    const paymentType = input.method?.paymentType ?? transaction.paymentType;
    const attemptCount = prior ? invoice.attemptCount + 1 : invoice.attemptCount;
    const attemptId = `billing-${invoice.id}-${attemptCount}`;
    const frozen = prior?.request === undefined ? {
      total: invoice.total, feesAmount: transaction.feeAmount, currency: transaction.currency,
      description: transaction.description ?? invoice.description ?? `Invoice ${invoice.id}`,
      referenceId: invoice.id, note: `invId:${invoice.id}|mid:${invoice.memberId}|lid:${invoice.locationId}`,
      metadata: { locationId: invoice.locationId, memberId: invoice.memberId, invoiceId: invoice.id },
    } : requestSchema.parse(prior.request);
    if (frozen.total !== invoice.total || frozen.currency.toUpperCase() !== transaction.currency.toUpperCase()
      || frozen.feesAmount !== transaction.feeAmount) {
      throw new Error(`Invoice ${invoice.id}'s frozen request changed`);
    }
    const request: InvoicePaymentRequest = {
      ...frozen, invoiceId: invoice.id, attemptId, gateway: input.gateway, paymentMethodId, paymentType,
      metadata: { ...frozen.metadata, billingAttemptId: attemptId },
      note: `${frozen.note.split("|billingAttemptId:")[0]}|billingAttemptId:${attemptId}`,
    };
    const billingAttempt = {
      id: attemptId, status: "in_flight" as const, startedAt: new Date().toISOString(),
      gatewayIntegrationId: prepared.gatewayIntegrationId, gatewayCustomerId: prepared.gatewayCustomerId,
      stripeAccountId: prepared.stripeAccountId ?? input.gateway.stripeAccountId, paymentMethodId, paymentType,
      request: { ...frozen, note: request.note, metadata: request.metadata },
    };
    await tx.update(memberInvoices).set({ attemptCount, paymentType, metadata: { ...invoice.metadata, billingAttempt }, updated: new Date() }).where(eq(memberInvoices.id, invoice.id));
    await tx.update(transactions).set({ paymentMethodId, paymentType, paymentIntentId: null, status: "pending", updated: new Date() }).where(eq(transactions.id, transaction.id));
    return { status: "claimed" as const, request };
  });
  if (claim.replay) {
    return recordInvoicePayment(database, {
      status: "succeeded", invoiceId: claim.replay.invoice.id, attemptId: claim.replay.prior.id,
      paymentIntentId: claim.replay.prior.paymentIntentId!, amount: claim.replay.invoice.total,
      currency: claim.replay.invoice.currency!, gateway: input.gateway,
    }, owner);
  }
  if (!claim.request) return claim.status;
  let outcome: InvoicePaymentOutcome;
  const { invoiceId, attemptId } = claim.request;
  try {
    outcome = await charge(claim.request);
  } catch (error) {
    // The gateway may have charged. The attempt stays unknown until a webhook or support settles it.
    console.error("Invoice payment result is unknown", { invoiceId, attemptId, error });
    outcome = { status: "unknown" };
  }
  return recordInvoicePayment(database, { ...outcome, invoiceId, attemptId, gateway: input.gateway }, owner).catch((error) => {
    console.error("Invoice payment was charged but could not be saved", { invoiceId, attemptId, outcome, error });
    throw error;
  });
}
