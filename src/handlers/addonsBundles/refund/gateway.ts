import { db } from "@/db/db";
import { AuthorizeApiError, AuthorizePaymentGateway, SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { integrations, memberSubscriptions } from "@/subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { SquareError } from "square";
import Stripe from "stripe";
import { z } from "zod";
import type { BundleRefundCharge } from "./charges";
import {
  bundleRefundAmounts,
  getRefundAttempt,
  saveRefundOutcome,
  type BundleRefundAttempt,
  type BundleRefundBinding,
  type BundleRefundOutcome,
} from "./state";

const paymentBindingSchema = z.object({
  gatewayService: z.enum(["stripe", "square", "authorize"]).optional(),
  gatewayIntegrationId: z.string().optional(),
  authorizeIntegrationId: z.string().optional(),
  paymentIntentId: z.string().nullish(),
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
export async function getRefundGateway(charge: BundleRefundCharge): Promise<BundleRefundGateway> {
  if (charge.transaction.paymentType === "cash") {
    return { service: "cash", binding: { service: "cash", paymentId: charge.transaction.id } };
  }

  const previous = getRefundAttempt(charge.transaction.metadata);
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

/** A 4xx the provider won't change its mind about; a 408 or 409 can still succeed. */
function isRejection(statusCode: number | undefined) {
  return statusCode !== undefined && statusCode >= 400 && statusCode < 500 && statusCode !== 408 && statusCode !== 409;
}

export function refundFailure(cause: unknown) {
  if (cause instanceof SquareError) {
    const body = squareErrorsSchema.safeParse(cause.body);
    const message = body.success ? body.data.errors?.[0]?.detail ?? cause.message : cause.message;
    return { message, definite: isRejection(cause.statusCode) };
  }

  if (cause instanceof AuthorizeApiError) return { message: cause.message, definite: rejectedAuthorizeRefundCodes.has(cause.code) };

  if (cause instanceof Stripe.errors.StripeError) {
    return { message: cause.message, definite: isRejection(cause.statusCode) };
  }

  return { message: cause instanceof Error ? cause.message : "The gateway could not confirm this refund.", definite: false };
}

export function refundableRemainder(charge: BundleRefundCharge, paid: number, completed: number, pending: number) {
  const amounts = bundleRefundAmounts(charge);
  const returned = Math.max(amounts.refundedAmount, completed);

  return Math.max(0, Math.min(amounts.refundableAmount - returned - pending, paid - completed - pending));
}

export function noRemainingRefund(completed: number, pending: number): BundleRefundOutcome {
  return {
    status: pending > 0 ? "failed" : "completed",
    amount: 0,
    operation: "refund",
    refundedAmount: completed,
    error: pending > 0 ? "Another refund is still processing for this charge. Check again later." : undefined,
  };
}

/** Saves the pending refund before the provider call, so an interrupted
 * request is reconciled instead of submitted again. Only a conclusive
 * provider rejection fails; any other error leaves the refund unknown. */
export async function submitRefund(
  charge: BundleRefundCharge,
  attempt: BundleRefundAttempt,
  plan: Pick<BundleRefundOutcome, "amount" | "operation">,
  send: () => Promise<BundleRefundOutcome>,
): Promise<BundleRefundOutcome> {
  await saveRefundOutcome(charge, attempt, { status: "pending", amount: plan.amount, operation: plan.operation });

  try {
    return await send();
  } catch (cause) {
    const failure = refundFailure(cause);

    return { status: failure.definite ? "failed" : "unknown", amount: plan.amount, operation: plan.operation, error: failure.message };
  }
}
