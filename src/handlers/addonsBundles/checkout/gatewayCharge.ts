import { SquarePaymentGateway } from "@/libs/PaymentGateway";
import { Currency } from "square";
import { z } from "zod";
import { squareOutcome, type InvoicePaymentOutcome, type InvoicePaymentRequest } from "@/subtrees/utils/server/bundlePayments";
import { isPaymentDecline, paymentFailureFromError } from "@/subtrees/utils/workflow/payments";
import { chargeWithGateway, stripePaymentIntentFromError } from "@/utils/checkoutUtil";
import type { PaymentType } from "@/subtrees/types";
import { CheckoutError, getCheckoutContext, type CheckoutContext } from "@/utils/getCheckoutContext";

/** Why the location's gateway cannot charge this saved payment, if it cannot.
 * Checked before the attempt is claimed, so the charge only fails on provider I/O. */
function chargeUnavailable(gateway: CheckoutContext["gateway"], paymentType: PaymentType, total: number): string | null {
  if (gateway.service === "stripe") return null;

  if (paymentType !== "card") return "This location's payment gateway only accepts saved cards";

  if (gateway.service === "square" && total > 0 && !gateway.metadata.squareLocationId) {
    return "This location's Square gateway has no Square location configured";
  }

  return null;
}

/** The location's gateway for this member, or why it can't charge this payment type and total. */
export async function checkoutGateway(locationId: string, memberId: string, paymentType: PaymentType, total: number) {
  try {
    const context = await getCheckoutContext({ lid: locationId, mid: memberId });
    const error = chargeUnavailable(context.gateway, paymentType, total);
    return error ? { error } : { context };
  } catch (error) {
    if (error instanceof CheckoutError) return { error: error.message };

    throw error;
  }
}

export async function chargeBundleInvoice(
  request: InvoicePaymentRequest,
  gateway: CheckoutContext["gateway"],
  charge?: typeof chargeWithGateway,
): Promise<InvoicePaymentOutcome> {
  try {
    if (!charge && gateway.service === "square" && request.total > 0) {
      const payment = await new SquarePaymentGateway(gateway.accessToken).createCharge(request.gateway.customerId, request.paymentMethodId, {
        total: request.total, feesAmount: request.feesAmount, currency: z.enum(Currency).parse(request.currency),
        referenceId: request.referenceId, note: request.note, idempotencyKey: request.attemptId,
        // SAFETY: pay rejects a Square charge over $0 without a location before claiming the attempt.
        squareLocationId: gateway.metadata.squareLocationId!,
      });
      return squareOutcome(payment, request);
    }
    const result = await (charge ?? chargeWithGateway)({
      ...request, gateway, gatewayCustomerId: request.gateway.customerId,
      transactionId: request.attemptId, attempt: { id: request.attemptId, invoiceId: request.invoiceId },
    });
    switch (result.status) {
      case "approved":
        return { status: "succeeded", paymentIntentId: result.paymentIntentId, amount: request.total, currency: request.currency, gatewayMetadata: result.gatewayMetadata, brand: result.brand, last4: result.last4, paymentType: result.paymentType };
      case "failed":
        if (gateway.service === "authorize" && String(result.gatewayMetadata.authorizeResponseCode) !== "2") return { status: "unknown", paymentIntentId: result.paymentIntentId, gatewayMetadata: result.gatewayMetadata };
        return {
          status: "failed", paymentIntentId: result.paymentIntentId, reason: result.failureReason,
          code: result.failureCode, retryable: true, gatewayMetadata: result.gatewayMetadata,
          brand: result.brand, last4: result.last4, paymentType: result.paymentType,
          workflowDecline: isPaymentDecline(gateway.service, result.failureCode, result.gatewayMetadata.squarePaymentStatus, result.gatewayMetadata.authorizeResponseCode),
        };
      case "uncertain":
        if (result.paymentIntentStatus === "requires_payment_method" || result.paymentIntentStatus === "canceled") {
          return { status: "failed", paymentIntentId: result.paymentIntentId, reason: result.message, code: result.paymentIntentStatus, retryable: true, workflowDecline: false };
        }
        return {
          status: result.paymentIntentStatus === "processing" || result.paymentIntentStatus === "requires_action" ? result.paymentIntentStatus : "unknown",
          paymentIntentId: result.paymentIntentId, gatewayMetadata: result.gatewayMetadata,
        };
    }
  } catch (error) {
    const decline = paymentFailureFromError(error);
    if (decline) return {
      status: "failed", paymentIntentId: decline.paymentIntentId, reason: decline.failureReason,
      code: decline.failureCode, retryable: true, workflowDecline: true,
    };
    console.error("Bundle charge threw without a decline", { invoiceId: request.invoiceId, attemptId: request.attemptId, error });
    const intent = stripePaymentIntentFromError(error);
    return {
      status: intent?.status === "processing" || intent?.status === "requires_action" ? intent.status : "unknown",
      paymentIntentId: intent?.id,
    };
  }
}
