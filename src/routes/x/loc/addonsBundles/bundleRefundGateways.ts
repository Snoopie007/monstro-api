import { db } from "@/db/db";
import { AuthorizeApiError, AuthorizePaymentGateway, SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { integrations, memberSubscriptions } from "@/subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { Currency, SquareError, type PaymentRefund } from "square";
import Stripe from "stripe";
import { z } from "zod";
import type { BundleRefundCharge } from "./bundleChargeOwnership";
import {
  bundleRefundAmounts,
  bundleRefundKey,
  readBundleRefundAttempt,
  saveBundleRefundOutcome,
  type BundleRefundAttempt,
  type BundleRefundBinding,
  type BundleRefundOutcome,
} from "./bundleRefundState";

const squareCurrency = z.enum(Currency);

const paymentBindingSchema = z.object({
  gatewayService: z.enum(["stripe", "square", "authorize"]).optional(),
  gatewayIntegrationId: z.string().optional(),
  authorizeIntegrationId: z.string().optional(),
  paymentIntentId: z.string().nullish(),
  stripeChargeId: z.string().optional(),
  squarePaymentId: z.string().optional(),
  authorizeTransactionId: z.string().optional(),
  chargeId: z.string().optional(),
  billingAttempt: z.object({ gatewayIntegrationId: z.string().optional() }).optional(),
});

export type BundleRefundGateway =
  | { service: "cash"; binding: BundleRefundBinding }
  | { service: "stripe"; binding: BundleRefundBinding; client: StripePaymentGateway }
  | { service: "square"; binding: BundleRefundBinding; client: SquarePaymentGateway }
  | { service: "authorize"; binding: BundleRefundBinding; client: AuthorizePaymentGateway };

/** Prefer the saved charge/invoice binding. A location's current gateway can
 * differ from the integration that collected this older payment. */
export async function loadBundleRefundGateway(charge: BundleRefundCharge): Promise<BundleRefundGateway> {
  if (charge.transaction.paymentType === "cash") {
    return { service: "cash", binding: { service: "cash", paymentId: charge.transaction.id } };
  }

  const previous = readBundleRefundAttempt(charge.transaction.metadata);
  const transaction = paymentBindingSchema.parse(charge.transaction.metadata);
  const invoice = paymentBindingSchema.parse(charge.invoice.metadata ?? {});
  const subscription = charge.invoice.memberPlanId
    ? await db.query.memberSubscriptions.findFirst({
      where: eq(memberSubscriptions.id, charge.invoice.memberPlanId),
      columns: { metadata: true },
    })
    : undefined;
  const subscriptionPayment = paymentBindingSchema.parse(subscription?.metadata ?? {});
  const service = previous?.gatewayService ?? transaction.gatewayService ?? invoice.gatewayService ?? subscriptionPayment.gatewayService;

  if (!service || service === "cash") throw new Error("The original payment gateway is unavailable for this charge.");

  const paymentId = previous?.paymentId ?? charge.transaction.paymentIntentId ?? transaction.paymentIntentId
    ?? transaction.squarePaymentId ?? transaction.authorizeTransactionId ?? transaction.chargeId;

  if (!paymentId) throw new Error("The original payment ID is missing. Staff must check this charge.");

  const integrationId = previous?.gatewayIntegrationId ?? transaction.authorizeIntegrationId ?? transaction.gatewayIntegrationId
    ?? invoice.billingAttempt?.gatewayIntegrationId ?? invoice.gatewayIntegrationId
    ?? (subscriptionPayment.gatewayService === service ? subscriptionPayment.gatewayIntegrationId : undefined);
  const candidates = await db.select().from(integrations).where(and(
    eq(integrations.locationId, charge.transaction.locationId),
    eq(integrations.service, service),
    integrationId ? eq(integrations.id, integrationId) : undefined,
  )).limit(2);
  const [integration] = candidates;

  if (!integration || candidates.length !== 1) {
    throw new Error("The integration that collected this charge is unavailable. Reconnect it before retrying.");
  }

  const binding = { service, paymentId, integrationId: integration.id };

  switch (service) {
    case "stripe":
      if (!integration.accessToken) throw new Error("The Stripe connection for this charge is unavailable.");

      return { service, binding, client: new StripePaymentGateway(integration.accessToken) };
    case "square":
      if (!integration.accessToken) throw new Error("The Square connection for this charge is unavailable.");

      return { service, binding, client: new SquarePaymentGateway(integration.accessToken) };
    case "authorize":
      if (!integration.apiKey || !integration.secretKey) throw new Error("The Authorize.net connection for this charge is unavailable.");

      return { service, binding, client: new AuthorizePaymentGateway(integration.apiKey, integration.secretKey) };
  }
}

// The unchanged Authorize helper exposes only a code/message on failure.
// Validation/refund rejections are conclusive; held, duplicate, system, and
// unfamiliar responses require reconciliation instead of a second credit.
const rejectedAuthorizeRefundCodes = new Set([
  "2", "16", "33", "48", "49", "50", "51", "53", "54", "55", "56",
  "E00002", "E00003", "E00004", "E00005", "E00006", "E00007", "E00008", "E00009", "E00010",
]);

const squareErrorsSchema = z.object({ errors: z.array(z.object({ detail: z.string().optional() })).optional() });

export function bundleRefundFailure(cause: unknown) {
  if (cause instanceof SquareError) {
    const body = squareErrorsSchema.safeParse(cause.body);
    const message = body.success ? body.data.errors?.[0]?.detail ?? cause.message : cause.message;
    const definite = cause.statusCode !== undefined && cause.statusCode >= 400 && cause.statusCode < 500 && cause.statusCode !== 408 && cause.statusCode !== 409;

    return { message, definite };
  }

  if (cause instanceof AuthorizeApiError) return { message: cause.message, definite: rejectedAuthorizeRefundCodes.has(cause.code) };

  if (cause instanceof Stripe.errors.StripeError) {
    const definite = cause.statusCode !== undefined && cause.statusCode >= 400 && cause.statusCode < 500 && cause.statusCode !== 408 && cause.statusCode !== 409;

    return { message: cause.message, definite };
  }

  return { message: cause instanceof Error ? cause.message : "The gateway could not confirm this refund.", definite: false };
}

function refundableRemainder(charge: BundleRefundCharge, paid: number, completed: number, pending: number) {
  const amounts = bundleRefundAmounts(charge);
  const returned = Math.max(amounts.refundedAmount, completed);

  return Math.max(0, Math.min(amounts.refundableAmount - returned - pending, paid - completed - pending));
}

function noRemainingRefund(completed: number, pending: number): BundleRefundOutcome {
  return {
    status: pending > 0 ? "failed" : "completed",
    amount: 0,
    operation: "refund",
    refundedAmount: completed,
    error: pending > 0 ? "Another refund is still processing for this charge. Check again later." : undefined,
  };
}

function stripeRefundOutcome(refund: Stripe.Refund, completed: number): BundleRefundOutcome {
  const status = refund.status === "succeeded" ? "completed"
    : refund.status === "failed" || refund.status === "canceled" ? "failed" : "pending";

  return {
    status,
    amount: refund.amount,
    id: refund.id,
    operation: "refund",
    refundedAmount: completed,
    error: status === "failed" ? `Stripe could not return this charge: ${refund.failure_reason ?? refund.status}.`
      : status === "pending" ? "Stripe is still processing this refund. Check again later." : undefined,
  };
}

const stripePaymentReferenceSchema = z.union([
  z.string(),
  z.object({ id: z.string() }).transform((payment) => payment.id),
]).nullable();

export async function refundBundleStripeCharge(
  gateway: Extract<BundleRefundGateway, { service: "stripe" }>,
  charge: BundleRefundCharge,
  attempt: BundleRefundAttempt,
  reconcile: boolean,
): Promise<BundleRefundOutcome> {
  const { payment, refunds } = await gateway.client.inspectPaymentRefunds(attempt.paymentId);
  const completed = refunds.reduce((sum, refund) => sum + (refund.status === "succeeded" ? refund.amount : 0), 0);
  const pending = refunds.reduce((sum, refund) => sum + (refund.status !== "succeeded" && refund.status !== "failed" && refund.status !== "canceled" ? refund.amount : 0), 0);

  if (payment.currency.toUpperCase() !== charge.transaction.currency.toUpperCase()) throw new Error("Stripe's charge currency does not match the saved payment.");

  if (reconcile) {
    const refund = attempt.id
      ? await gateway.client.retrieveRefund(attempt.id)
      : refunds.find((candidate) => candidate.metadata?.monstroBundleRefundKey === bundleRefundKey(charge.transaction.id, attempt));

    if (!refund) {
      return { status: "unknown", amount: attempt.amount, operation: "refund", error: "Stripe has not confirmed this refund. Staff must check it before another refund is submitted." };
    }

    const paymentId = stripePaymentReferenceSchema.parse(refund.payment_intent);

    if (paymentId !== attempt.paymentId || refund.amount !== attempt.amount) throw new Error("Stripe's refund does not match this charge and amount.");

    const returned = completed + (refund.status === "succeeded" && !refunds.some((candidate) => candidate.id === refund.id) ? refund.amount : 0);

    return stripeRefundOutcome(refund, returned);
  }

  if (payment.status !== "succeeded") throw new Error("Stripe has not finished collecting this charge. Try again after the payment settles.");

  const amount = Math.min(attempt.amount, refundableRemainder(charge, payment.amount_received, completed, pending));

  if (amount === 0) return noRemainingRefund(completed, pending);

  await saveBundleRefundOutcome(charge, attempt, { status: "pending", amount, operation: "refund" });

  try {
    const refund = await gateway.client.createRefund(attempt.paymentId, amount, charge.transaction.currency, bundleRefundKey(charge.transaction.id, attempt));

    return stripeRefundOutcome(refund, completed + (refund.status === "succeeded" ? refund.amount : 0));
  } catch (cause) {
    const failure = bundleRefundFailure(cause);

    return { status: failure.definite ? "failed" : "unknown", amount, operation: "refund", error: failure.message };
  }
}

function squareMoney(amount: bigint | null | undefined) {
  const value = Number(amount ?? 0n);

  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Square returned an invalid refund amount.");

  return value;
}

function squareRefundOutcome(refund: PaymentRefund, completed: number): BundleRefundOutcome {
  const status = refund.status === "COMPLETED" ? "completed"
    : refund.status === "FAILED" || refund.status === "REJECTED" ? "failed" : "pending";

  return {
    status,
    amount: squareMoney(refund.amountMoney.amount),
    id: refund.id,
    operation: "refund",
    refundedAmount: completed,
    error: status === "failed" ? `Square ${refund.status === "REJECTED" ? "rejected" : "could not complete"} this refund.`
      : status === "pending" ? "Square is still processing this refund. Check again later." : undefined,
  };
}

export async function refundBundleSquareCharge(
  gateway: Extract<BundleRefundGateway, { service: "square" }>,
  charge: BundleRefundCharge,
  attempt: BundleRefundAttempt,
  reconcile: boolean,
): Promise<BundleRefundOutcome> {
  const { payment, refunds } = await gateway.client.inspectPaymentRefunds(attempt.paymentId);
  const completed = refunds.reduce((sum, refund) => sum + (refund.status === "COMPLETED" ? squareMoney(refund.amountMoney.amount) : 0), 0);
  const pending = Math.max(
    refunds.reduce((sum, refund) => sum + (refund.status === "PENDING" ? squareMoney(refund.amountMoney.amount) : 0), 0),
    squareMoney(payment.refundedMoney?.amount) - completed,
  );
  const currency = payment.totalMoney?.currency ?? payment.amountMoney?.currency;

  if (currency !== charge.transaction.currency.toUpperCase()) throw new Error("Square's charge currency does not match the saved payment.");

  const reason = `Bundle refund ${bundleRefundKey(charge.transaction.id, attempt)}`;

  if (reconcile) {
    const refund = attempt.id
      ? await gateway.client.retrieveRefund(attempt.id)
      : await gateway.client.findRefundByReason(attempt.paymentId, reason, new Date(Date.parse(attempt.requestedAt) - 300_000).toISOString());

    if (!refund) {
      return { status: "unknown", amount: attempt.amount, operation: "refund", error: "Square has not confirmed this refund. Staff must check it before another refund is submitted." };
    }

    if (refund.paymentId !== attempt.paymentId || squareMoney(refund.amountMoney.amount) !== attempt.amount) throw new Error("Square's refund does not match this charge and amount.");

    const returned = completed + (refund.status === "COMPLETED" && !refunds.some((candidate) => candidate.id === refund.id) ? squareMoney(refund.amountMoney.amount) : 0);

    return squareRefundOutcome(refund, returned);
  }

  if (payment.status !== "COMPLETED") throw new Error("Square has not finished collecting this charge. Try again after the payment settles.");

  const amount = Math.min(attempt.amount, refundableRemainder(charge, squareMoney(payment.totalMoney?.amount ?? payment.amountMoney?.amount), completed, pending));

  if (amount === 0) return noRemainingRefund(completed, pending);

  await saveBundleRefundOutcome(charge, attempt, { status: "pending", amount, operation: "refund" });

  try {
    const refund = await gateway.client.refundPayment(
      attempt.paymentId,
      amount,
      reason,
      bundleRefundKey(charge.transaction.id, attempt),
      squareCurrency.parse(charge.transaction.currency.toUpperCase()),
    );

    return squareRefundOutcome(refund, completed + (refund.status === "COMPLETED" ? squareMoney(refund.amountMoney.amount) : 0));
  } catch (cause) {
    const failure = bundleRefundFailure(cause);

    return { status: failure.definite ? "failed" : "unknown", amount, operation: "refund", error: failure.message };
  }
}
