import { SquarePaymentGateway } from "@/libs/PaymentGateway";
import { Currency } from "square";
import { z } from "zod";
import type { InvoicePaymentOutcome, InvoicePaymentRequest } from "@/subtrees/utils/server/bundlePayments";
import { isPaymentDecline, paymentFailureFromError } from "@/subtrees/utils/workflow/payments";
import { chargeWithGateway, stripePaymentIntentFromError } from "@/utils/checkoutUtil";
import type { CheckoutContext } from "@/utils/getCheckoutContext";

export async function chargeBundleInvoice(
  request: InvoicePaymentRequest,
  gateway: CheckoutContext["gateway"],
  charge?: typeof chargeWithGateway,
): Promise<InvoicePaymentOutcome> {
  try {
    // SAFETY: pay rejects a Square charge over $0 without a location before claiming the attempt.
    if (!charge && gateway.service === "square" && request.total > 0) return await chargeSquareBundle(request, gateway, gateway.metadata.squareLocationId!);
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

async function chargeSquareBundle(
  request: InvoicePaymentRequest,
  gateway: Extract<CheckoutContext["gateway"], { service: "square" }>,
  squareLocationId: string,
): Promise<InvoicePaymentOutcome> {
  const payment = await new SquarePaymentGateway(gateway.accessToken).createCharge(request.gateway.customerId, request.paymentMethodId, {
    total: request.total, feesAmount: request.feesAmount, currency: z.enum(Currency).parse(request.currency),
    referenceId: request.referenceId, note: request.note, idempotencyKey: request.attemptId, squareLocationId,
  });
  const paymentIntentId = payment?.id;
  switch (payment?.status) {
    case "COMPLETED":
      if (!paymentIntentId) return { status: "unknown" };
      return { status: "succeeded", paymentIntentId, amount: request.total, currency: request.currency, receiptUrl: payment.receiptUrl,
        gatewayMetadata: { squarePaymentId: paymentIntentId }, brand: payment.cardDetails?.card?.cardBrand, last4: payment.cardDetails?.card?.last4, paymentType: "card" };
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
