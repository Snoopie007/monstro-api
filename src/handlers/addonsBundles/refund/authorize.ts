import type { AuthorizeTransactionDetails } from "@/libs/PaymentGateway/AuthorizePayment";
import { z } from "zod";
import type { BundleRefundCharge } from "./charges";
import { submitRefund, type BundleRefundGateway } from "./gateway";
import { bundleRefundAmounts, type BundleRefundAttempt, type BundleRefundOutcome } from "./state";

function authorizeAmount(details: AuthorizeTransactionDetails) {
  const settled = details.transactionStatus === "settledSuccessfully" || details.transactionStatus === "refundSettledSuccessfully";
  const providerAmount = settled ? details.settleAmount ?? details.authAmount ?? details.amount
    : details.authAmount ?? details.amount ?? details.settleAmount;
  const amount = z.coerce.number().nonnegative().parse(providerAmount);
  const cents = Math.round(amount * 100);

  if (!Number.isSafeInteger(cents)) throw new Error("Authorize.net returned an invalid charge amount.");

  return cents;
}

function completedOriginal(attempt: BundleRefundAttempt, amount: number): BundleRefundOutcome {
  return { status: "completed", amount: 0, operation: attempt.operation, refundedAmount: amount };
}

async function reconcileAuthorizeRefund(
  gateway: Extract<BundleRefundGateway, { service: "authorize" }>,
  charge: BundleRefundCharge,
  attempt: BundleRefundAttempt,
): Promise<BundleRefundOutcome> {
  const details = await gateway.client.getTransactionDetails(attempt.id ?? attempt.paymentId);

  if (!attempt.id) {
    // A still-settled original charge says nothing about an interrupted credit.
    // Authorize has no idempotent follow-on operation, so never resubmit it.
    if (attempt.operation === "void" && details.transactionStatus === "voided") {
      return completedOriginal(attempt, Math.min(charge.transaction.total, authorizeAmount(details)));
    }

    if (details.transactionStatus === "refunded") {
      return completedOriginal(attempt, Math.min(charge.transaction.total, authorizeAmount(details)));
    }

    return {
      status: "unknown",
      amount: attempt.amount,
      operation: attempt.operation,
      error: "Authorize.net has not confirmed this refund. Staff must check it before another refund is submitted.",
    };
  }

  if (attempt.operation === "void") {
    if (details.transId !== attempt.paymentId && details.refTransId !== attempt.paymentId) {
      throw new Error("Authorize.net's void does not match the original charge.");
    }

    return {
      status: details.transactionStatus === "voided" ? "completed" : "pending",
      amount: attempt.amount,
      id: attempt.id,
      operation: "void",
      refundedAmount: details.transactionStatus === "voided" ? charge.transaction.total : undefined,
      error: details.transactionStatus === "voided" ? undefined : "Authorize.net is still processing this cancellation. Check again later.",
    };
  }

  if (details.refTransId !== attempt.paymentId || authorizeAmount(details) !== attempt.amount) {
    throw new Error("Authorize.net's refund does not match this charge and amount.");
  }

  const status = details.transactionStatus === "refundSettledSuccessfully" ? "completed"
    : details.transactionStatus === "declined" || details.transactionStatus === "failedReview" || details.transactionStatus === "voided" ? "failed" : "pending";

  return {
    status,
    amount: attempt.amount,
    id: attempt.id,
    operation: "refund",
    error: status === "failed" ? details.responseReasonDescription ?? "Authorize.net could not complete this refund."
      : status === "pending" ? "Authorize.net is still processing this refund. Check again later." : undefined,
  };
}

/** Authorize can void an unsettled charge or credit a settled card charge.
 * Keeping fees back rules out a full void; unsupported payments fail alone. */
export async function refundBundleAuthorizeCharge(
  gateway: Extract<BundleRefundGateway, { service: "authorize" }>,
  charge: BundleRefundCharge,
  attempt: BundleRefundAttempt,
  reconcile: boolean,
): Promise<BundleRefundOutcome> {
  if (reconcile) return reconcileAuthorizeRefund(gateway, charge, attempt);

  const details = await gateway.client.getTransactionDetails(attempt.paymentId);
  const paid = Math.min(charge.transaction.total, authorizeAmount(details));
  const amounts = bundleRefundAmounts(charge);

  if (details.currencyCode && details.currencyCode.toUpperCase() !== charge.transaction.currency.toUpperCase()) {
    throw new Error("Authorize.net's charge currency does not match the saved payment.");
  }

  if (details.transactionStatus === "voided" || details.transactionStatus === "refunded") {
    return completedOriginal(attempt, paid);
  }

  const amount = Math.max(0, Math.min(attempt.amount, paid - amounts.refundedAmount));

  if (amount === 0) return completedOriginal(attempt, amounts.refundedAmount);

  const unsettled = details.transactionStatus === "capturedPendingSettlement" || details.transactionStatus === "authorizedPendingCapture";
  const operation = unsettled ? "void" : "refund";

  if (unsettled && (amount !== paid || amounts.nonRefundableAmount > 0 || charge.total !== charge.transaction.total || amounts.refundedAmount > 0)) {
    throw new Error("Authorize.net can only void the entire unsettled charge. Try again after it settles to keep non-refundable fees back.");
  }

  if (!unsettled && details.transactionStatus !== "settledSuccessfully") {
    throw new Error(`Authorize.net cannot refund this charge while its status is ${details.transactionStatus ?? "unavailable"}.`);
  }

  const last4 = details.payment?.creditCard?.cardNumber?.match(/\d{4}$/)?.[0];

  if (operation === "refund" && !last4) {
    throw new Error("Authorize.net card details are unavailable. Staff must handle this refund through the gateway.");
  }

  return submitRefund(charge, attempt, { amount, operation }, async () => {
    let refund: AuthorizeTransactionDetails;

    if (operation === "void") {
      refund = await gateway.client.voidTransaction(attempt.paymentId);
    } else {
      if (!last4) throw new Error("Authorize.net card details are unavailable.");

      refund = await gateway.client.refundTransaction(attempt.paymentId, amount, last4);
    }

    // Approved voids release the whole charge. An approved credit still needs
    // settlement, which a later lookup or follow-on webhook confirms.
    return {
      status: operation === "void" ? "completed" : "pending",
      amount,
      operation,
      id: refund.transId && refund.transId !== "0" ? refund.transId : undefined,
      refundedAmount: operation === "void" ? paid : undefined,
      error: operation === "void" ? undefined : "Authorize.net is still processing this refund. Check again later.",
    };
  });
}
