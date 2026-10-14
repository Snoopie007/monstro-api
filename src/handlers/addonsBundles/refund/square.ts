import { Currency, type PaymentRefund } from "square";
import { z } from "zod";
import type { BundleRefundCharge } from "./charges";
import { noRemainingRefund, refundableRemainder, submitRefund, type BundleRefundGateway } from "./gateway";
import { bundleRefundKey, type BundleRefundAttempt, type BundleRefundOutcome } from "./state";

const squareCurrency = z.enum(Currency);

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

  return submitRefund(charge, attempt, { amount, operation: "refund" }, async () => {
    const refund = await gateway.client.refundPayment(
      attempt.paymentId,
      amount,
      reason,
      bundleRefundKey(charge.transaction.id, attempt),
      squareCurrency.parse(charge.transaction.currency.toUpperCase()),
    );

    return squareRefundOutcome(refund, completed + (refund.status === "COMPLETED" ? squareMoney(refund.amountMoney.amount) : 0));
  });
}
