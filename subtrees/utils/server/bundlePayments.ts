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
type PaymentTransaction = typeof transactions.$inferSelect;
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

/** The fields of a Square payment the collector reads. */
type SquareCharge = { id?: string; status?: string; receiptUrl?: string | null; cardDetails?: { card?: { cardBrand?: string; last4?: string } } };

/** A Square card charge's answer as a collector outcome. PENDING and APPROVED
 * payments are still settling, so their webhook decides them. */
export function squareOutcome(payment: SquareCharge | undefined, request: InvoicePaymentRequest): InvoicePaymentOutcome {
  const paymentIntentId = payment?.id;
  switch (payment?.status) {
    case "COMPLETED":
      if (!paymentIntentId) return { status: "unknown" };
      return {
        status: "succeeded", paymentIntentId, amount: request.total, currency: request.currency, receiptUrl: payment.receiptUrl,
        gatewayMetadata: { squarePaymentId: paymentIntentId, squarePaymentStatus: payment.status },
        brand: payment.cardDetails?.card?.cardBrand, last4: payment.cardDetails?.card?.last4, paymentType: "card",
      };
    case "APPROVED":
    case "PENDING":
      return { status: "processing", paymentIntentId };
    case "FAILED":
    case "CANCELED":
      return { status: "failed", paymentIntentId, reason: "Square payment failed", code: payment.status, retryable: true, workflowDecline: payment.status === "FAILED" };
    default:
      return { status: "unknown", paymentIntentId };
  }
}

/** The invoice's billing attempt, in main's SubscriptionBillingAttempt shape.
 * The collector also keeps the request it sent, so a retry sends the same one. */
export const attemptSchema = z.looseObject({
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
}) satisfies z.ZodType<SubscriptionBillingAttempt>;
type Attempt = z.infer<typeof attemptSchema>;

/** The gateway and customer an invoice was prepared to charge, saved on
 * its transaction when the invoice was created. */
const chargeBindingSchema = z.looseObject({
  gatewayIntegrationId: z.string(),
  gatewayCustomerId: z.string(),
  stripeAccountId: z.string().optional(),
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

function getAttempt(invoice: PaymentInvoice) {
  const value: unknown = invoice.metadata?.billingAttempt;
  return value == null ? null : attemptSchema.parse(value);
}

type LockedPayment = Awaited<ReturnType<typeof lockPayment>>;

/** Locks an invoice's payment in the same order as cancellation: the bundle and
 * its parts (or a standalone add-on and its subscription) first, then the invoice
 * and its transaction. The owner is reread under the locks; nothing financial
 * relies on the first read. */
async function lockPayment(tx: InvoicePaymentTransaction, invoiceId: string) {
  const discovered = await findInvoiceOwner(tx, invoiceId);
  if (!discovered) throw new Error(`Invoice ${invoiceId} has no payment owner`);
  if (discovered.purchaseId === null) await lockAddon(tx, discovered.subscriptionId, discovered.addonId);
  else await lockBundle(tx, discovered.purchaseId);
  const { invoice, transaction } = await lockInvoice(tx, invoiceId);
  return { invoice, transaction, ...await getLockedOwner(tx, invoice, discovered) };
}

/** The owner of an invoice, found without locks. A bundled add-on invoice
 * belongs to the add-on's bundle, a checkout invoice to the bundle it bought,
 * and a standalone add-on invoice to the add-on alone. Null when the collector
 * doesn't charge the invoice. */
export async function findInvoiceOwner(tx: Pick<Database, "query">, invoiceId: string) {
  const invoice = await tx.query.memberInvoices.findFirst({ where: eq(memberInvoices.id, invoiceId) });
  if (!invoice) return null;
  const addon = invoice.memberSubscriptionAddonId
    ? await tx.query.memberSubscriptionAddons.findFirst({ where: eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId) })
    : undefined;
  const purchase = addon?.bundlePurchaseId
    ? await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.id, addon.bundlePurchaseId) })
    : await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.invoiceId, invoiceId) });
  if (purchase) return { purchaseId: purchase.id, addonId: invoice.memberSubscriptionAddonId };
  if (!addon) return null;
  return { purchaseId: null, addonId: addon.id, subscriptionId: addon.memberSubscriptionId };
}

/** Locks a standalone add-on's subscription, then the add-on: the order the worker bills in. */
async function lockAddon(tx: InvoicePaymentTransaction, subscriptionId: string, addonId: string) {
  await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions).where(eq(memberSubscriptions.id, subscriptionId)).for("update");
  await tx.select({ id: memberSubscriptionAddons.id }).from(memberSubscriptionAddons).where(eq(memberSubscriptionAddons.id, addonId)).for("update");
}

/** Locks the bundle, its root subscriptions, their child subscriptions and its add-ons, each in id order.
 * Bundle payment collection, mark-paid and bundled add-on cancellation lock a bundle this way. */
export async function lockBundle(tx: InvoicePaymentTransaction, purchaseId: string) {
  await tx.select({ id: bundlePurchases.id }).from(bundlePurchases).where(eq(bundlePurchases.id, purchaseId)).for("update");
  const roots = await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions)
    .where(eq(memberSubscriptions.bundlePurchaseId, purchaseId)).orderBy(asc(memberSubscriptions.id)).for("update");
  if (roots.length) await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions)
    .where(inArray(memberSubscriptions.parentId, roots.map(root => root.id))).orderBy(asc(memberSubscriptions.id)).for("update");
  await tx.select({ id: memberSubscriptionAddons.id }).from(memberSubscriptionAddons)
    .where(eq(memberSubscriptionAddons.bundlePurchaseId, purchaseId)).orderBy(asc(memberSubscriptionAddons.id)).for("update");
}

/** Locks the invoice and its transaction. Both must name the same payer and amount. */
async function lockInvoice(tx: InvoicePaymentTransaction, invoiceId: string) {
  const [invoice] = await tx.select().from(memberInvoices).where(eq(memberInvoices.id, invoiceId)).for("update");
  if (!invoice?.transactionId) throw new Error(`Invoice ${invoiceId} has no stored transaction`);
  const [transaction] = await tx.select().from(transactions).where(eq(transactions.id, invoice.transactionId)).for("update");
  if (!transaction) throw new Error(`Invoice ${invoiceId} has no stored transaction`);
  if (!isSameCharge(invoice, transaction)) throw new Error(`Invoice ${invoiceId} does not match its stored transaction`);
  return { invoice, transaction };
}

function isSameCharge(invoice: PaymentInvoice, transaction: PaymentTransaction) {
  return transaction.locationId === invoice.locationId && transaction.memberId === invoice.memberId
    && transaction.total === invoice.total && transaction.currency.toUpperCase() === invoice.currency?.toUpperCase();
}

/** Rereads the owner under the locks. Throws when the invoice moved to another
 * owner, or the owner's member or location no longer match the invoice. */
async function getLockedOwner(tx: InvoicePaymentTransaction, invoice: PaymentInvoice, discovered: NonNullable<Awaited<ReturnType<typeof findInvoiceOwner>>>) {
  // A standalone add-on has no bundle. A missing bundle row counts as moved below.
  const purchase = discovered.purchaseId === null ? null : await tx.query.bundlePurchases.findFirst({ where: eq(bundlePurchases.id, discovered.purchaseId) });
  const addon = invoice.memberSubscriptionAddonId
    ? await tx.query.memberSubscriptionAddons.findFirst({ where: eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId) })
    : undefined;
  const moved = invoice.memberSubscriptionAddonId !== discovered.addonId
    || (addon ? addon.bundlePurchaseId !== discovered.purchaseId : purchase?.invoiceId !== invoice.id);
  if (moved) throw new Error(`Invoice ${invoice.id}'s payment owner changed`);

  const subscription = addon
    ? await tx.query.memberSubscriptions.findFirst({ where: eq(memberSubscriptions.id, addon.memberSubscriptionId), columns: { memberId: true, locationId: true } })
    : null;
  if (!isSamePayer(invoice, purchase, addon, subscription)) throw new Error(`Invoice ${invoice.id}'s payer does not match its owner`);
  return { purchase, addon };
}

function isSamePayer(
  invoice: PaymentInvoice,
  purchase: { memberId: string } | null | undefined,
  addon: object | undefined,
  subscription: { memberId: string; locationId: string | null } | null | undefined,
) {
  if (purchase && purchase.memberId !== invoice.memberId) return false;
  // An add-on's subscription must belong to the invoice's member and location.
  return !addon || (subscription?.memberId === invoice.memberId && subscription.locationId === invoice.locationId);
}

function isRefunded(transaction: PaymentTransaction, paymentIntentId?: string) {
  const refund = transaction.metadata.refund;
  return transaction.refunded || (refund?.status === "completed" && refund.paymentId === paymentIntentId);
}

/** True when the answer names this attempt, or, without an attempt id, its PaymentIntent. */
function isSameAttempt(attempt: Attempt, input: InvoicePaymentRecord) {
  if (input.attemptId !== undefined) return input.attemptId === attempt.id;
  return input.paymentIntentId !== undefined && input.paymentIntentId === attempt.paymentIntentId;
}

/** True when the answer came through the attempt's gateway. Fields the gateway didn't send aren't compared. */
function isSameGateway(invoice: PaymentInvoice, attempt: Attempt, gateway: InvoicePaymentRecord["gateway"]) {
  return gateway.service === invoice.metadata?.gatewayService
    && (gateway.integrationId === undefined || gateway.integrationId === attempt.gatewayIntegrationId)
    && (gateway.customerId === undefined || gateway.customerId === attempt.gatewayCustomerId)
    && (gateway.paymentMethodId === undefined || gateway.paymentMethodId === attempt.paymentMethodId)
    && (gateway.service !== "stripe" || gateway.stripeAccountId === attempt.stripeAccountId);
}

/** Throws when the answer's gateway, PaymentIntent, amount or currency differ from the attempt's. */
function assertSameCharge(invoice: PaymentInvoice, attempt: Attempt, input: InvoicePaymentRecord) {
  if (!isSameGateway(invoice, attempt, input.gateway)) throw new Error(`Payment gateway does not match invoice ${invoice.id}`);

  if (attempt.paymentIntentId && input.paymentIntentId && attempt.paymentIntentId !== input.paymentIntentId) {
    throw new Error(`Payment does not match invoice ${invoice.id}'s billing attempt`);
  }
  const sameAmount = (input.amount === undefined || input.amount === invoice.total)
    && (input.currency === undefined || input.currency.toUpperCase() === invoice.currency?.toUpperCase());
  if (!sameAmount) throw new Error(`Payment amount or currency does not match invoice ${invoice.id}`);
}

/** Why an answer changes nothing, or null when it should be saved. */
function skipReason(invoice: PaymentInvoice, transaction: PaymentTransaction, attempt: Attempt, input: InvoicePaymentRecord) {
  if (isRefunded(transaction, input.paymentIntentId)) return "refunded" as const;

  // The same success arriving again on a paid invoice is a replay; anything else is stale.
  if (invoice.paid || invoice.status === "paid") {
    return input.status === "succeeded" && transaction.paymentIntentId === input.paymentIntentId ? "replay" as const : "ignored" as const;
  }

  // A finished attempt only accepts a success. A late progress event or a repeated decline is ignored.
  if ((attempt.status === "succeeded" || attempt.status === "failed") && input.status !== "succeeded") return "ignored" as const;
  return null;
}

/** What an answer means for the invoice and transaction rows. */
function outcomeFields(input: InvoicePaymentOutcome, invoiceStatus: PaymentInvoice["status"]) {
  // A voided invoice stays void; any other unpaid invoice stays unpaid.
  const unpaid = invoiceStatus === "void" ? "void" as const : "unpaid" as const;

  switch (input.status) {
    case "succeeded":
      return { invoiceStatus: "paid" as const, paid: true, transactionStatus: "paid" as const, failure: null, activity: "Payment succeeded." };
    case "failed":
      return { invoiceStatus: unpaid, paid: false, transactionStatus: "failed" as const, failure: { reason: input.reason, code: input.code }, activity: `Payment failed: ${input.reason}` };
    default:
      return { invoiceStatus: unpaid, paid: false, transactionStatus: "pending" as const, failure: null, activity: `Payment ${input.status}.` };
  }
}

/** The transaction's metadata plus the gateway's details and the card or bank shown to staff. */
function paymentMetadata(transaction: PaymentTransaction, attempt: Attempt, input: InvoicePaymentOutcome) {
  const metadata: TransactionMetadata = { ...transaction.metadata, ...input.gatewayMetadata };
  if (input.brand && input.last4) {
    if ((input.paymentType ?? attempt.paymentType) === "us_bank_account") {
      metadata.us_bank_account = { bank_name: input.brand, last4: input.last4 };
    } else {
      metadata.card = { brand: input.brand, last4: input.last4 };
    }
  }
  // The gateway's metadata never overwrites a refund already recorded.
  if (transaction.metadata.refund) metadata.refund = transaction.metadata.refund;
  return metadata;
}

/** Saves an answer on the invoice, its transaction and its attempt. Returns the updated invoice. */
async function saveOutcome(tx: InvoicePaymentTransaction, invoice: PaymentInvoice, transaction: PaymentTransaction, attempt: Attempt, input: InvoicePaymentRecord) {
  const now = new Date();
  const fields = outcomeFields(input, invoice.status);
  const billingAttempt: SubscriptionBillingAttempt = { ...attempt, status: input.status };
  if (input.paymentIntentId) billingAttempt.paymentIntentId = input.paymentIntentId;
  if (input.status === "failed") billingAttempt.retryable = input.retryable;

  const [updated] = await tx.update(memberInvoices).set({
    status: fields.invoiceStatus,
    paid: fields.paid,
    // The gateway's reported method wins over the requested one; undefined leaves it unchanged.
    paymentType: input.paymentType,
    metadata: { ...invoice.metadata, billingAttempt },
    receiptUrl: input.receiptUrl || undefined,
    updated: now,
  }).where(eq(memberInvoices.id, invoice.id)).returning();
  await tx.update(transactions).set({
    status: fields.transactionStatus,
    paymentType: input.paymentType,
    paymentIntentId: input.paymentIntentId || undefined,
    failedReason: fields.failure?.reason ?? null,
    failedCode: fields.failure?.code ?? null,
    metadata: paymentMetadata(transaction, attempt, input),
    activities: [...transaction.activities, {
      reason: fields.activity,
      at: now.toISOString(),
      paymentType: input.paymentType ?? attempt.paymentType,
      brand: input.brand,
      last4: input.last4,
    }],
    updated: now,
  }).where(eq(transactions.id, transaction.id));

  // Only a real decline starts the payment-failed workflow.
  if (input.status === "failed" && input.workflowDecline) await dispatchPaymentFailed(tx, transaction.id);
  if (!updated) throw new Error(`Invoice ${invoice.id} disappeared during payment`);
  return updated;
}

/** Records a gateway's answer for a bundle invoice in one transaction. The owner
 * grants access in that transaction and returns the jobs to schedule after it
 * commits; a replayed success returns the same jobs, so a lost schedule recovers. */
export async function recordPayment<Jobs>(database: Database, input: InvoicePaymentRecord, owner: InvoicePaymentOwner<Jobs>) {
  const result = await database.transaction(async (tx) => {
    const { invoice, transaction } = await lockPayment(tx, input.invoiceId);
    const attempt = getAttempt(invoice);
    if (!attempt) throw new Error(`Invoice ${invoice.id} has no billing attempt`);

    // An answer for another attempt is ignored, unless it says money moved.
    if (!isSameAttempt(attempt, input)) {
      if (input.status === "succeeded") throw new Error(`Payment for invoice ${invoice.id} belongs to another attempt`);
      return { status: "ignored" as const };
    }
    assertSameCharge(invoice, attempt, input);

    const skipped = skipReason(invoice, transaction, attempt, input);
    if (skipped === "replay") return { status: "paid" as const, jobs: await owner.settle(tx, invoice, input) };
    if (skipped) return { status: skipped };

    const updated = await saveOutcome(tx, invoice, transaction, attempt, input);
    return { status: input.status, jobs: await owner.settle(tx, updated, input) };
  });
  if (result.jobs !== undefined) await owner.schedule(result.jobs);
  return result.status;
}

type CollectInput = {
  invoiceId: string;
  gateway: InvoiceGateway;
  retry?: boolean;
  method?: { paymentMethodId: string; paymentType: PaymentType };
};
type Claim =
  | { status: "claimed"; request: InvoicePaymentRequest }
  | { status: "paid"; invoice: PaymentInvoice; attemptId: string; paymentIntentId: string }
  | { status: "refunded" | "inactive" | Attempt["status"] };

/** False when the invoice is void, or its bundle or add-on stopped billing. */
async function isCollectible(tx: InvoicePaymentTransaction, { invoice, purchase, addon }: LockedPayment) {
  if (invoice.status === "void" || (purchase && hasEnded(purchase.status))) return false;
  if (!addon) return true;

  const subscription = await tx.query.memberSubscriptions.findFirst({ where: eq(memberSubscriptions.id, addon.memberSubscriptionId) });
  // A bundled add-on's subscription must still belong to the same bundle.
  return !addonNotCollectible(addon, purchase, subscription) && (!purchase || subscription?.bundlePurchaseId === purchase.id);
}

/** Why no new attempt can start, or null when one can. */
async function claimBlocker(tx: InvoicePaymentTransaction, locked: LockedPayment, retry?: boolean): Promise<Claim | null> {
  const { invoice, transaction } = locked;
  const prior = getAttempt(invoice);
  if (isRefunded(transaction, transaction.paymentIntentId ?? undefined)) return { status: "refunded" };

  // A paid invoice replays its last success, so the caller gets the paid result and jobs.
  if (invoice.paid || invoice.status === "paid") {
    if (!prior?.paymentIntentId) throw new Error(`Paid invoice ${invoice.id} has no payment attempt`);
    return { status: "paid", invoice, attemptId: prior.id, paymentIntentId: prior.paymentIntentId };
  }
  if (!await isCollectible(tx, locked)) return { status: "inactive" };

  // An attempt in progress or with an unknown result blocks a second charge.
  if (prior && prior.status !== "failed") return { status: prior.status };
  // A declined attempt is charged again only when the caller asks for a retry.
  if (prior?.status === "failed" && !retry) return { status: "failed" };
  return null;
}

/** The gateway and customer the invoice was prepared to charge. Throws when the
 * caller would charge through a different gateway, integration, customer or Stripe account. */
function getChargeBinding({ invoice, transaction }: LockedPayment, gateway: InvoiceGateway, prior: Attempt | null) {
  const binding = chargeBindingSchema.parse(transaction.metadata.chargeBinding ?? {
    gatewayIntegrationId: invoice.metadata?.gatewayIntegrationId,
    gatewayCustomerId: invoice.metadata?.gatewayCustomerId,
    stripeAccountId: prior?.stripeAccountId,
  });
  const changed = gateway.service !== invoice.metadata?.gatewayService
    || gateway.integrationId !== binding.gatewayIntegrationId || gateway.customerId !== binding.gatewayCustomerId
    || (gateway.service === "stripe" && binding.stripeAccountId !== undefined && gateway.stripeAccountId !== binding.stripeAccountId);
  if (changed) throw new Error(`Invoice ${invoice.id}'s payment gateway or customer changed`);
  return binding;
}

/** The first attempt's request, or a new one built from the invoice. A retry
 * must charge the same total, fee and currency as the first attempt. */
function frozenRequest({ invoice, transaction }: LockedPayment, prior: Attempt | null) {
  const frozen = prior?.request === undefined ? {
    total: invoice.total,
    feesAmount: transaction.feeAmount,
    currency: transaction.currency,
    description: transaction.description ?? invoice.description ?? `Invoice ${invoice.id}`,
    referenceId: invoice.id,
    note: `invId:${invoice.id}|mid:${invoice.memberId}|lid:${invoice.locationId}`,
    metadata: { locationId: invoice.locationId, memberId: invoice.memberId, invoiceId: invoice.id },
  } : requestSchema.parse(prior.request);
  if (frozen.total !== invoice.total || frozen.currency.toUpperCase() !== transaction.currency.toUpperCase()
    || frozen.feesAmount !== transaction.feeAmount) {
    throw new Error(`Invoice ${invoice.id}'s frozen request changed`);
  }
  return frozen;
}

/** Starts a new in-flight attempt and returns the request to send the gateway.
 * The attempt id goes into the request's metadata and note, so webhooks can name it. */
async function claimAttempt(tx: InvoicePaymentTransaction, locked: LockedPayment, input: CollectInput) {
  const { invoice, transaction } = locked;
  const prior = getAttempt(invoice);
  const binding = getChargeBinding(locked, input.gateway, prior);
  const paymentMethodId = input.method?.paymentMethodId ?? transaction.paymentMethodId;
  if (!paymentMethodId) throw new Error(`Invoice ${invoice.id} has no saved payment method`);
  const paymentType = input.method?.paymentType ?? transaction.paymentType;

  // The first attempt keeps the invoice's count; each retry adds one.
  const attemptCount = prior ? invoice.attemptCount + 1 : invoice.attemptCount;
  const attemptId = `billing-${invoice.id}-${attemptCount}`;
  const frozen = frozenRequest(locked, prior);
  const request: InvoicePaymentRequest = {
    ...frozen, invoiceId: invoice.id, attemptId, gateway: input.gateway, paymentMethodId, paymentType,
    metadata: { ...frozen.metadata, billingAttemptId: attemptId },
    note: `${frozen.note.split("|billingAttemptId:")[0]}|billingAttemptId:${attemptId}`,
  };
  const billingAttempt = {
    id: attemptId, status: "in_flight" as const, startedAt: new Date().toISOString(),
    gatewayIntegrationId: binding.gatewayIntegrationId, gatewayCustomerId: binding.gatewayCustomerId,
    stripeAccountId: binding.stripeAccountId ?? input.gateway.stripeAccountId, paymentMethodId, paymentType,
    request: { ...frozen, note: request.note, metadata: request.metadata },
  };

  await tx.update(memberInvoices).set({ attemptCount, paymentType, metadata: { ...invoice.metadata, billingAttempt }, updated: new Date() }).where(eq(memberInvoices.id, invoice.id));
  await tx.update(transactions).set({ paymentMethodId, paymentType, paymentIntentId: null, status: "pending", updated: new Date() }).where(eq(transactions.id, transaction.id));
  return request;
}

/** Charges a bundle or add-on invoice once per attempt: claims the attempt in one
 * transaction, charges outside it, then records the answer. An attempt in
 * progress or with an unknown result blocks new charges until a webhook or support settles it. */
export async function collectPayment<Jobs>(
  database: Database,
  input: CollectInput,
  charge: (request: InvoicePaymentRequest) => Promise<InvoicePaymentOutcome>,
  owner: InvoicePaymentOwner<Jobs>,
) {
  const claim = await database.transaction(async (tx): Promise<Claim> => {
    const locked = await lockPayment(tx, input.invoiceId);
    const blocked = await claimBlocker(tx, locked, input.retry);
    if (blocked) return blocked;
    return { status: "claimed", request: await claimAttempt(tx, locked, input) };
  });

  if (claim.status === "paid") {
    const { invoice, attemptId, paymentIntentId } = claim;
    return recordPayment(database, {
      status: "succeeded", invoiceId: invoice.id, attemptId, paymentIntentId,
      amount: invoice.total, currency: invoice.currency!, gateway: input.gateway,
    }, owner);
  }
  if (claim.status !== "claimed") return claim.status;

  let outcome: InvoicePaymentOutcome;
  const { invoiceId, attemptId } = claim.request;
  try {
    outcome = await charge(claim.request);
  } catch (error) {
    // The gateway may have charged. The attempt stays unknown until a webhook or support settles it.
    console.error("Invoice payment result is unknown", { invoiceId, attemptId, error });
    outcome = { status: "unknown" };
  }
  return recordPayment(database, { ...outcome, invoiceId, attemptId, gateway: input.gateway }, owner).catch((error) => {
    console.error("Invoice payment was charged but could not be saved", { invoiceId, attemptId, outcome, error });
    throw error;
  });
}
