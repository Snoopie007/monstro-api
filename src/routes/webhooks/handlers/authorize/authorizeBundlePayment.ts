import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { memberInvoices } from "@/subtrees/schemas";
import type { PaymentInvoice } from "@/subtrees/utils/server/invoicePayments";
import type { AuthorizeTransactionDetails } from "@/libs/PaymentGateway";
import { authorizeAttemptReference } from "@/utils/checkoutUtil";
import { isBundleInvoice, readBundleInvoice, recordBundlePayment } from "@/handlers/addonsBundles/checkout/settlement";

type AuthorizeBundlePayment = {
    transaction: { id: string; currency: string };
    integration: { id: string; locationId: string };
    details: AuthorizeTransactionDetails;
    state: "paid" | "pending" | "failed" | null;
    providerTransactionId: string;
    providerAmount: number;
};

/** The invoice's billing attempt, once the provider transaction is proven to belong to it. */
function matchedAttempt(invoice: PaymentInvoice, { integration, details, providerTransactionId }: AuthorizeBundlePayment) {
    const binding = readBundleInvoice(invoice.metadata);
    const attempt = binding.billingAttempt;
    if (!attempt || binding.gatewayIntegrationId !== integration.id || invoice.locationId !== integration.locationId) {
        throw new Error("Authorize.net invoice binding does not match");
    }
    if (details.order?.invoiceNumber !== authorizeAttemptReference(attempt.id) && attempt.paymentIntentId !== providerTransactionId) {
        throw new Error("Authorize.net payment belongs to another attempt");
    }
    if ((details.profile?.customerProfileId && details.profile.customerProfileId !== attempt.gatewayCustomerId)
        || (details.profile?.customerPaymentProfileId && details.profile.customerPaymentProfileId !== attempt.paymentMethodId)) {
        throw new Error("Authorize.net customer or method does not match the invoice");
    }
    return attempt;
}

/** Records an Authorize.net payment for a bundle invoice. False when the
 * transaction pays for something else. */
export async function recordAuthorizeBundlePayment(input: AuthorizeBundlePayment) {
    const { transaction, integration, details, state, providerTransactionId, providerAmount } = input;
    const invoice = await db.query.memberInvoices.findFirst({ where: eq(memberInvoices.transactionId, transaction.id) });
    if (!invoice || !await isBundleInvoice(invoice.id)) return false;

    const attempt = matchedAttempt(invoice, input);
    const common = {
        invoiceId: invoice.id,
        attemptId: attempt.id,
        paymentIntentId: providerTransactionId,
        gateway: {
            service: "authorize" as const,
            integrationId: integration.id,
            customerId: details.profile?.customerProfileId,
            paymentMethodId: details.profile?.customerPaymentProfileId,
        },
        gatewayMetadata: {
            authorizeTransactionId: providerTransactionId,
            authorizeIntegrationId: integration.id,
            authorizeResponseCode: String(details.responseCode ?? ""),
            authorizeProviderStatus: details.transactionStatus,
        },
    };

    // Response code 3 is a processing error, not proof the card was declined.
    if (state === "paid") {
        await recordBundlePayment({ ...common, status: "succeeded", amount: providerAmount, currency: details.currencyCode ?? transaction.currency });
    } else if (state === "failed" && String(details.responseCode) !== "3") {
        await recordBundlePayment({
            ...common,
            status: "failed",
            reason: details.responseReasonDescription ?? "Authorize.net payment failed",
            code: String(details.responseReasonCode ?? details.responseCode ?? "AUTHORIZE_FAILED"),
            retryable: true,
            workflowDecline: String(details.responseCode) === "2",
        });
    } else {
        await recordBundlePayment({ ...common, status: state === "pending" ? "processing" : "unknown" });
    }
    return true;
}
