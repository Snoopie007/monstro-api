import { getDeferredBilling, nextDeferredBillingBoundary } from "../deferredBilling";
import { and, eq, isNull, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { memberInvoices } from "../../schemas/invoice";
import { memberPlanPricing, memberSubscriptions } from "../../schemas";
import { transactions } from "../../schemas/transactions";
import { members } from "../../schemas/members";
import { locations } from "../../schemas/locations";
import { nextBillingBoundary } from "../subscriptionBilling";

type CashInvoiceDatabase = Pick<PostgresJsDatabase, "select" | "insert" | "update">;
type InvoiceValues = typeof memberInvoices.$inferInsert;
export type CashInvoiceQuote = {
  items: NonNullable<InvoiceValues["items"]>;
  subTotal: number;
  total: number;
  tax: number;
  currency: NonNullable<InvoiceValues["currency"]>;
  platformFeeAmount: number;
  invoiceDescription: string;
  transactionDescription: string;
};

export class CashInvoiceError extends Error {
  constructor(message: string, public readonly code: string) { super(message); }
}

/** Call inside the caller's transaction. Every cash invoice writer takes this
 * subscription lock and reuses the cycle's invoice before inserting anything. */
export async function ensureCashInvoice(tx: CashInvoiceDatabase, input: {
  subscriptionId: string;
  locationId: string;
  memberId: string;
  periodStart: Date;
  periodEnd: Date;
  quote: CashInvoiceQuote;
}) {
  const { subscriptionId, locationId, memberId, periodStart, periodEnd, quote } = input;
  const [sub] = await tx.select().from(memberSubscriptions).where(and(
    eq(memberSubscriptions.id, subscriptionId), eq(memberSubscriptions.locationId, locationId),
    eq(memberSubscriptions.memberId, memberId),
  )).for("update");
  if (!sub || sub.parentId || sub.paymentType !== "cash") throw new CashInvoiceError("Cash subscription not found", "SUBSCRIPTION_NOT_FOUND");
  if (!["active", "past_due", "unpaid", "incomplete", "trialing"].includes(sub.status)) {
    throw new CashInvoiceError("This subscription is not collecting cash payments", "SUBSCRIPTION_NOT_COLLECTING");
  }
  assertCashCollectionStarted(sub.metadata, periodStart);
  const renewing = sub.currentPeriodEnd.getTime() === periodStart.getTime();
  const renewalKey = `${subscriptionId}:${periodStart.toISOString()}`;
  const existing = await tx.select().from(memberInvoices).where(and(
    eq(memberInvoices.locationId, locationId), eq(memberInvoices.memberId, memberId),
    eq(memberInvoices.memberPlanId, subscriptionId),
    or(eq(memberInvoices.renewalKey, renewalKey),
      and(eq(memberInvoices.forPeriodStart, periodStart), eq(memberInvoices.forPeriodEnd, periodEnd)),
      and(isNull(memberInvoices.forPeriodStart), isNull(memberInvoices.forPeriodEnd), eq(memberInvoices.dueDate, periodStart))),
  ));
  if (existing.length) {
    const invoice = existing.find(invoice => invoice.paid || invoice.status === "paid")
      ?? existing.find(invoice => ["sent", "unpaid"].includes(invoice.status)) ?? existing[0]!;
    if (renewing) await advanceCashPeriod(tx, sub, periodStart, periodEnd, invoice.paid || invoice.status === "paid");
    return { invoice, created: false };
  }
  if (renewing) {
    await advanceCashPeriod(tx, sub, periodStart, periodEnd);
  } else if (sub.currentPeriodStart.getTime() !== periodStart.getTime() || sub.currentPeriodEnd.getTime() !== periodEnd.getTime()) {
    throw new CashInvoiceError("The billing period changed. Refresh the subscription.", "BILLING_PERIOD_CHANGED");
  }
  const [invoice] = await tx.insert(memberInvoices).values({
    memberId, locationId, memberPlanId: subscriptionId, renewalKey,
    forPeriodStart: periodStart, forPeriodEnd: periodEnd, dueDate: periodStart,
    description: quote.invoiceDescription, items: quote.items,
    subTotal: quote.subTotal, total: quote.total, tax: quote.tax, currency: quote.currency,
    status: "draft", paymentType: "cash", invoiceType: "recurring",
    metadata: {
      type: "from-subscription", subscriptionId, collectionMethod: "send_invoice", platformFeeAmount: quote.platformFeeAmount,
      commissionAllowanceInterval: (sub.metadata?.commissionBilling as Record<string, unknown> | undefined)?.allowanceInterval,
      commissionBillingInterval: (sub.metadata?.commissionBilling as Record<string, unknown> | undefined)?.billingInterval,
      commissionBillingThreshold: (sub.metadata?.commissionBilling as Record<string, unknown> | undefined)?.billingThreshold,
      commissionVisitAllowance: (sub.metadata?.commissionBilling as Record<string, unknown> | undefined)?.visitAllowance,
    },
  }).returning();
  if (!invoice) throw new Error("Failed to create cash invoice");
  const [transaction] = await tx.insert(transactions).values({
    memberId, locationId, description: quote.transactionDescription,
    type: "inbound", status: "failed", paymentType: "cash",
    items: quote.items ?? [], total: quote.total, subTotal: quote.subTotal, tax: quote.tax,
    currency: quote.currency ?? "USD", feeAmount: quote.platformFeeAmount,
  }).returning({ id: transactions.id });
  if (!transaction) throw new Error("Failed to create cash invoice transaction");
  await tx.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoice.id));
  return { invoice: { ...invoice, transactionId: transaction.id }, created: true };
}

/** Block cash invoices before the first payment is due. Call this after locking the subscription row. */
function assertCashCollectionStarted(metadata: Record<string, unknown> | null, periodStart: Date) {
  const deferred = getDeferredBilling(metadata);
  if (deferred && (periodStart < new Date(deferred.firstPaymentAt) || new Date() < new Date(deferred.firstPaymentAt))) {
    throw new CashInvoiceError("First payment is not due yet", "SUBSCRIPTION_NOT_COLLECTING");
  }
}

/** Renew on the calendar boundary, even while a previous period is unpaid.
 * The caller inserts the new invoice in this same transaction. */
async function advanceCashPeriod(tx: CashInvoiceDatabase, sub: typeof memberSubscriptions.$inferSelect, start: Date, end: Date, paid = false) {
  const now = new Date();
  if (start > now || sub.cancelAtPeriodEnd || (sub.cancelAt && sub.cancelAt <= start) || (sub.trialEnd && sub.trialEnd > now)) {
    throw new CashInvoiceError("This subscription cannot renew yet", "SUBSCRIPTION_NOT_COLLECTING");
  }
  const [pricing] = await tx.select().from(memberPlanPricing).where(eq(memberPlanPricing.id, sub.memberPlanPricingId!));
  if (!pricing?.interval || !pricing.intervalThreshold) throw new CashInvoiceError("Missing billing cadence", "BILLING_PERIOD_CHANGED");
  const stored = typeof sub.metadata.cashBillingAnchor === "string" ? new Date(sub.metadata.cashBillingAnchor) : start;
  const anchor = Number.isFinite(stored.getTime()) ? stored : start;
  const deferred = getDeferredBilling(sub.metadata);
  const [location] = deferred ? await tx.select({ timezone: locations.timezone }).from(locations).where(eq(locations.id, sub.locationId)) : [];
  if (deferred && !location) throw new CashInvoiceError("Billing location not found", "BILLING_PERIOD_CHANGED");
  const boundary = deferred ? nextDeferredBillingBoundary(deferred, start, pricing.interval, pricing.intervalThreshold, location!.timezone) : nextBillingBoundary(anchor, start, pricing.interval, pricing.intervalThreshold);
  if (boundary.getTime() !== end.getTime()) {
    throw new CashInvoiceError("The billing period changed. Refresh the subscription.", "BILLING_PERIOD_CHANGED");
  }
  await tx.update(memberSubscriptions).set({
    currentPeriodStart: start, currentPeriodEnd: end, status: paid ? sub.status : "past_due",
    metadata: { ...sub.metadata, cashBillingAnchor: anchor.toISOString() },
    makeUpCredits: sub.allowMakeUpCarryOver ? sub.makeUpCredits : 0, updated: now,
  }).where(eq(memberSubscriptions.id, sub.id));
}

export type CashInvoiceEmail = {
  to: string;
  subject: string;
  template: "InvoiceReminderEmail";
  metadata: {
    member: { firstName: string; lastName: string | null };
    invoice: { id: string; total: number; dueDate: string; description: string | null; items: NonNullable<InvoiceValues["items"]>; currency: string; paymentType: "cash" };
    location: { name: string; address: string | null; email: string | null; phone: string | null };
    timezone: string;
  };
};

/** Call in a separate transaction after preparation, so every collector locks
 * invoice before subscription, in the same order as payment confirmation. */
export async function issueCashInvoice(tx: CashInvoiceDatabase, locationId: string, invoiceId: string,
  enqueue: (email: CashInvoiceEmail, jobId: string) => Promise<unknown>,
) {
  const [invoice] = await tx.select().from(memberInvoices).where(and(
    eq(memberInvoices.id, invoiceId), eq(memberInvoices.locationId, locationId),
  )).for("update");
  if (!invoice || invoice.paymentType !== "cash") throw new CashInvoiceError("Cash invoice not found", "INVOICE_NOT_FOUND");
  if (["sent", "unpaid", "paid"].includes(invoice.status)) return { id: invoice.id, status: invoice.status, emailQueued: false };
  if (invoice.status !== "draft" || invoice.paid) throw new CashInvoiceError("Invoice must be draft to send", "INVOICE_NOT_DRAFT");
  if (invoice.memberPlanId) {
    const [sub] = await tx.select().from(memberSubscriptions).where(and(
      eq(memberSubscriptions.id, invoice.memberPlanId), eq(memberSubscriptions.locationId, locationId), eq(memberSubscriptions.memberId, invoice.memberId),
    )).for("update");
    if (!sub || sub.parentId) throw new CashInvoiceError("Only a paying subscription can issue an invoice", "SUBSCRIPTION_NOT_FOUND");
    if (sub.paymentType !== "cash" || !["active", "past_due", "unpaid", "trialing"].includes(sub.status)) {
      throw new CashInvoiceError("This subscription is not collecting cash payments", "SUBSCRIPTION_NOT_COLLECTING");
    }
  }
  const [member] = await tx.select().from(members).where(eq(members.id, invoice.memberId));
  const [location] = await tx.select().from(locations).where(eq(locations.id, locationId));
  if (!member?.email || !location) throw new CashInvoiceError("Member email and location are required to send this invoice", "EMAIL_UNAVAILABLE");
  await enqueue({
    to: member.email, subject: `Invoice from ${location.name}`, template: "InvoiceReminderEmail",
    metadata: {
      member: { firstName: member.firstName, lastName: member.lastName },
      invoice: { id: invoice.id, total: invoice.total, dueDate: invoice.dueDate.toISOString(), description: invoice.description,
        items: invoice.items || [], currency: invoice.currency || "USD", paymentType: "cash" },
      location: { name: location.name, address: location.address, email: location.email, phone: location.phone },
      timezone: location.timezone,
    },
  }, `cashInvoiceEmail_${invoice.id}`);
  await tx.update(memberInvoices).set({ status: "sent", sentAt: new Date(), updated: new Date() }).where(eq(memberInvoices.id, invoiceId));
  return { id: invoiceId, status: "sent" as const, emailQueued: true };
}
