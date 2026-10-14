import { db } from "@/db/db";
import { createHash } from "node:crypto";
import { memberInvoices, transactions } from "@/subtrees/schemas";
import type { TransactionMetadata, TransactionRefund } from "@/subtrees/types";
import { getRefundAmounts } from "@/utils/refunds";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import type { BundleRefundCharge } from "./charges";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

const refundAttemptSchema = z.object({
  amount: z.number().int().nonnegative(),
  nonRefundableAmount: z.number().int().nonnegative(),
  status: z.enum(["pending", "unknown", "failed", "completed"]),
  // Zero verifies a refund made by a legacy flow. It never submits money.
  attempt: z.number().int().nonnegative(),
  requestedAt: z.iso.datetime({ offset: true }),
  paymentId: z.string().min(1),
  gatewayService: z.enum(["cash", "stripe", "square", "authorize"]),
  gatewayIntegrationId: z.string().optional(),
  operation: z.enum(["refund", "void"]),
  id: z.string().optional(),
  error: z.string().optional(),
});

const legacyRefundMetadataSchema = z.object({
  refund: z.object({
    id: z.string().min(1).nullish(),
    amount: z.number().int().nonnegative().nullish(),
  }).nullish(),
  squareRefundId: z.string().min(1).nullish(),
  authorizeRefundTransactionId: z.string().min(1).nullish(),
  authorizeVoidTransactionId: z.string().min(1).nullish(),
  authorizeRefundOperation: z.enum(["refund", "void"]).optional(),
});

export type BundleRefundAttempt = z.infer<typeof refundAttemptSchema>;

export type BundleRefundBinding = {
  service: BundleRefundAttempt["gatewayService"];
  paymentId: string;
  integrationId?: string;
};

export type BundleRefundOutcome = {
  status: BundleRefundAttempt["status"];
  amount: number;
  operation: BundleRefundAttempt["operation"];
  id?: string;
  error?: string;
  // Provider-confirmed cumulative refunds, including any earlier refund.
  refundedAmount?: number;
};

export function readBundleRefundAttempt(metadata: TransactionMetadata) {
  if (metadata.refund?.attempt === undefined) return null;

  return refundAttemptSchema.parse(metadata.refund);
}

export function bundleRefundKey(transactionId: string, attempt: BundleRefundAttempt) {
  // Square accepts at most 45 characters. The same reference is used for
  // provider submission and interrupted-request reconciliation.
  return createHash("sha256").update(`${transactionId}:bundle-refund:${attempt.attempt}`).digest("base64url");
}

/** Legacy gateway refunds wrote these counters before a pending refund could
 * settle. Cash records are staff-confirmed and keep their existing meaning. */
export function hasLegacyBundleRefund(transaction: typeof transactions.$inferSelect) {
  if (transaction.paymentType === "cash" || transaction.metadata.refund?.attempt !== undefined) return false;

  return transaction.refunded || transaction.refundedAmount > 0
    || transaction.metadata.refund?.id != null || transaction.metadata.squareRefundId != null
    || transaction.metadata.authorizeRefundTransactionId != null || transaction.metadata.authorizeVoidTransactionId != null;
}

export function bundleRefundAmounts(charge: BundleRefundCharge) {
  const amounts = getRefundAmounts(charge.total, charge.items);
  const refundedAmount = hasLegacyBundleRefund(charge.transaction) ? 0
    : Math.max(0, Math.min(charge.transaction.total, charge.transaction.refundedAmount));

  return { ...amounts, refundedAmount, remainingAmount: Math.max(0, amounts.refundableAmount - refundedAmount) };
}

/** Only a failed or completed attempt can be replaced. Provider calls happen
 * after this transaction commits, and other requests can only reconcile it. */
export async function claimBundleRefund(charge: BundleRefundCharge, binding: BundleRefundBinding) {
  return db.transaction(async (tx) => {
    const [transaction] = await tx.select().from(transactions)
      .where(eq(transactions.id, charge.transaction.id)).for("update");

    if (!transaction || transaction.status !== "paid" || transaction.total !== charge.transaction.total) {
      throw new Error("The paid charge changed while its refund was being prepared. Try again.");
    }

    const current = { ...charge, transaction };
    const existing = readBundleRefundAttempt(transaction.metadata);

    if (existing && existing.paymentId !== binding.paymentId) {
      throw new Error("The payment changed after this refund began. Staff must check the charge.");
    }

    if (existing?.status === "pending" || existing?.status === "unknown") {
      return { action: "reconcile" as const, charge: current, attempt: existing };
    }

    const amounts = bundleRefundAmounts(current);

    if (!existing && hasLegacyBundleRefund(transaction)) {
      const legacy = legacyRefundMetadataSchema.parse(transaction.metadata);
      const id = legacy.refund?.id ?? legacy.squareRefundId ?? legacy.authorizeRefundTransactionId ?? legacy.authorizeVoidTransactionId ?? undefined;
      const operation = legacy.authorizeRefundOperation ?? (legacy.authorizeVoidTransactionId ? "void" : "refund");
      const recordedAmount = Math.max(0, transaction.refundedAmount);
      const legacyAmount = legacy.refund?.amount ?? recordedAmount;
      const amount = operation === "void" ? transaction.total
        : binding.service === "authorize" ? Math.max(legacyAmount, recordedAmount) : legacyAmount;
      const attempt: BundleRefundAttempt = {
        amount,
        nonRefundableAmount: amounts.nonRefundableAmount,
        status: id ? "pending" : "unknown",
        attempt: 0,
        requestedAt: new Date().toISOString(),
        paymentId: binding.paymentId,
        gatewayService: binding.service,
        gatewayIntegrationId: binding.integrationId,
        operation,
        id,
        error: id ? undefined : "An earlier refund has no confirmation ID. Staff must check the gateway before another refund is submitted.",
      };
      const [saved] = await tx.update(transactions).set({
        refunded: false,
        refundedAmount: 0,
        metadata: { ...transaction.metadata, refund: { ...transaction.metadata.refund, ...attempt } },
        updated: new Date(),
      }).where(eq(transactions.id, transaction.id)).returning();

      if (!saved) throw new Error("The earlier refund could not be saved for verification");

      return { action: "reconcile" as const, charge: { ...current, transaction: saved }, attempt };
    }

    if (amounts.remainingAmount === 0) return { action: "finished" as const, charge: current };

    const attempt: BundleRefundAttempt = {
      amount: amounts.remainingAmount,
      nonRefundableAmount: amounts.nonRefundableAmount,
      status: "pending",
      attempt: (existing?.attempt ?? 0) + 1,
      requestedAt: new Date().toISOString(),
      paymentId: binding.paymentId,
      gatewayService: binding.service,
      gatewayIntegrationId: binding.integrationId,
      operation: "refund",
    };

    await tx.update(transactions).set({
      metadata: {
        ...transaction.metadata,
        refund: { ...transaction.metadata.refund, ...attempt, id: undefined, error: undefined, refundedAt: undefined },
      },
      updated: new Date(),
    }).where(eq(transactions.id, transaction.id));

    return { action: "submit" as const, charge: current, attempt };
  });
}

async function saveRefundOutcome(
  tx: Transaction,
  transactionId: string,
  attempt: BundleRefundAttempt,
  outcome: BundleRefundOutcome,
) {
  // Settlement callbacks lock invoices before transactions. Keep that order.
  await tx.select({ id: memberInvoices.id }).from(memberInvoices)
    .where(eq(memberInvoices.transactionId, transactionId)).for("update");

  const [transaction] = await tx.select().from(transactions)
    .where(eq(transactions.id, transactionId)).for("update");

  if (!transaction) throw new Error("The charge disappeared while its refund was being saved");

  const current = readBundleRefundAttempt(transaction.metadata);

  // A webhook or another reconciliation may have completed this same attempt.
  if (!current || current.attempt !== attempt.attempt || current.status === "completed") return transaction;

  const completed = outcome.status === "completed";
  const refundedAmount = completed
    ? Math.min(transaction.total, Math.max(transaction.refundedAmount + outcome.amount, outcome.refundedAmount ?? 0))
    : Math.min(transaction.total, Math.max(transaction.refundedAmount, outcome.refundedAmount ?? 0));
  const { refundedAmount: _providerRefundedAmount, ...progress } = outcome;
  const refund: TransactionRefund = {
    ...transaction.metadata.refund,
    ...current,
    ...progress,
    // A reconciliation may have started before the submitting request saved
    // its exact provider amount/operation. Unknown results retain that data.
    amount: outcome.status === "unknown" ? current.amount : outcome.amount,
    operation: outcome.status === "unknown" ? current.operation : outcome.operation,
    id: outcome.id ?? current.id,
    error: outcome.error,
    refundedAt: completed ? new Date().toISOString() : transaction.metadata.refund?.refundedAt,
  };
  const [saved] = await tx.update(transactions).set({
    metadata: { ...transaction.metadata, refund },
    refundedAmount,
    refunded: completed ? refundedAmount >= transaction.total - current.nonRefundableAmount : transaction.refunded,
    updated: new Date(),
  }).where(eq(transactions.id, transaction.id)).returning();

  if (!saved) throw new Error("The refund result was not saved");

  if (completed && refundedAmount >= transaction.total) {
    await tx.update(memberInvoices).set({ status: "void", paid: false, updated: new Date() })
      .where(eq(memberInvoices.transactionId, transaction.id));
  }

  return saved;
}

export async function saveBundleRefundOutcome(charge: BundleRefundCharge, attempt: BundleRefundAttempt, outcome: BundleRefundOutcome) {
  return db.transaction((tx) => saveRefundOutcome(tx, charge.transaction.id, attempt, outcome));
}

/** Authorize follow-on webhooks use the same locked refund write. They must not
 * add the same refund twice or treat a pending credit as returned money. */
export async function recordBundleAuthorizeRefund(tx: Transaction, input: {
  transactionId: string;
  refundId: string;
  paymentId: string | undefined;
  amount: number;
  operation: "refund" | "void";
  providerStatus: string | undefined;
}) {
  await tx.select({ id: memberInvoices.id }).from(memberInvoices)
    .where(eq(memberInvoices.transactionId, input.transactionId)).for("update");

  const [transaction] = await tx.select().from(transactions)
    .where(eq(transactions.id, input.transactionId)).for("update");

  if (!transaction) return false;

  const attempt = readBundleRefundAttempt(transaction.metadata);

  if (!attempt || attempt.gatewayService !== "authorize") return false;

  if (input.paymentId !== attempt.paymentId || input.amount !== attempt.amount || input.operation !== attempt.operation) {
    throw new Error("Authorize.net refund does not match the saved bundle refund attempt");
  }

  if (attempt.id && input.refundId !== attempt.id) return true;

  const completed = input.operation === "void" && input.providerStatus === "voided"
    || input.operation === "refund" && input.providerStatus === "refundSettledSuccessfully";

  await saveRefundOutcome(tx, transaction.id, attempt, {
    status: completed ? "completed" : "pending",
    amount: attempt.amount,
    operation: input.operation,
    id: input.refundId,
    error: completed ? undefined : "Authorize.net is still processing this refund. Check again later.",
  });

  return true;
}

/** Configuration and ownership failures also persist, but cannot release an
 * existing pending provider operation while another request is handling it. */
export async function rememberBundleRefundFailure(charge: BundleRefundCharge, message: string) {
  return db.transaction(async (tx) => {
    const [transaction] = await tx.select().from(transactions)
      .where(eq(transactions.id, charge.transaction.id)).for("update");

    if (!transaction) throw new Error("The charge disappeared while its refund was being saved");

    const current = readBundleRefundAttempt(transaction.metadata);
    const legacy = hasLegacyBundleRefund(transaction);
    const unresolved = current?.status === "pending" || current?.status === "unknown" || legacy;
    const refund: TransactionRefund = {
      ...transaction.metadata.refund,
      amount: transaction.metadata.refund?.amount ?? bundleRefundAmounts(charge).remainingAmount,
      status: unresolved ? current?.status ?? "unknown" : "failed",
      error: message,
    };
    const [saved] = await tx.update(transactions).set({
      metadata: { ...transaction.metadata, refund },
      updated: new Date(),
    }).where(eq(transactions.id, transaction.id)).returning();

    if (!saved) throw new Error("The refund failure was not saved");

    return saved;
  });
}

/** A late payment callback can have read metadata before the refund claim.
 * Preserve the current attempt atomically when it writes payment metadata. */
export function preserveBundleRefundProgress(paymentMetadata: TransactionMetadata) {
  const serialized = JSON.stringify(paymentMetadata);

  return sql<TransactionMetadata>`case
    when ${transactions.metadata}->'refund'->>'attempt' is not null
      then jsonb_set(${serialized}::jsonb, '{refund}', ${transactions.metadata}->'refund')
    else ${serialized}::jsonb
  end`;
}

/** Completed refunds keep their invoice void when the original success
 * callback is replayed. A first late success has no completed attempt. */
export function isBundleRefundPaymentReplay(metadata: TransactionMetadata, paymentId: string | null) {
  const refund = readBundleRefundAttempt(metadata);

  return refund?.status === "completed" && refund.paymentId === paymentId;
}

/** Bundle retry responses can arrive after a refund committed. Lock in the
 * same order as refund finalization before deciding whether to save payment. */
export async function lockBundleRefundPaymentReplay(tx: Transaction, transactionId: string, paymentId: string | null) {
  await tx.select({ id: memberInvoices.id }).from(memberInvoices)
    .where(eq(memberInvoices.transactionId, transactionId)).for("update");

  const transaction = await tx.query.transactions.findFirst({
    where: eq(transactions.id, transactionId),
    columns: { metadata: true },
  });

  return transaction ? isBundleRefundPaymentReplay(transaction.metadata, paymentId) : false;
}
