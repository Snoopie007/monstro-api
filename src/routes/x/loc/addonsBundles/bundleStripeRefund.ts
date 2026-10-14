import type Stripe from "stripe";
import { z } from "zod";
import type { BundleRefundCharge } from "./bundleChargeOwnership";
import { noRemainingRefund, refundableRemainder, submitRefund, type BundleRefundGateway } from "./bundleRefundGateways";
import { bundleRefundKey, type BundleRefundAttempt, type BundleRefundOutcome } from "./bundleRefundState";

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

  return submitRefund(charge, attempt, { amount, operation: "refund" }, async () => {
    const refund = await gateway.client.createRefund(attempt.paymentId, amount, charge.transaction.currency, bundleRefundKey(charge.transaction.id, attempt));

    return stripeRefundOutcome(refund, completed + (refund.status === "succeeded" ? refund.amount : 0));
  });
}
