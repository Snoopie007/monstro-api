import { db } from "@/db/db";
import {
    calculateChargeDetails,
    chargeWithGateway,
    getCheckoutContext,
    PaymentChargeError,
    type ChargeWithGatewayResult,
} from "@/utils";
import { transactions } from "@subtrees/schemas";
import { generateUUID } from "@subtrees/utils/generateUUID";
import { SquareError } from "square";
import Stripe from "stripe";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
import {
    createEventRegistration,
    EventRegistrationError,
    loadEventRegistrationContext,
    type LoadEventContextParams,
} from "./shared";

type HandlePaidEventRegistrationProps = LoadEventContextParams & {
    paymentMethodId: string;
    paymentType?: "card" | "us_bank_account";
    attemptId: string;
};

export async function handlePaidEventRegistration(props: HandlePaidEventRegistrationProps) {
    const { lid, mid, paymentMethodId, paymentType = "card", attemptId } = props;
    const transactionId = generateUUID('txn_');


    const { event, ticket } = await loadEventRegistrationContext(props);
    if (ticket.pricingMethod === "free" || ticket.price <= 0) {
        throw new EventRegistrationError(400, "This ticket is free");
    }

    const { gatewayCustomerId, locationState, taxRates, gateway } = await getCheckoutContext({ lid, mid });
    const { currency } = locationState;
    const { total, feesAmount, tax, subTotal } = calculateChargeDetails({
        amount: ticket.price,
        taxRate: taxRates.find((r) => r.isDefault)?.percentage || 0,
        passOnFees: locationState.settings?.passOnFees || false,
        usagePercent: locationState.usagePercent || 0,
        paymentType,
        isRecurring: false,
    });
    const description = `${event.name} - ${ticket.name}`;
    const registrationId = generateUUID("erg_");
    const metadata: Record<string, unknown> = {
        ...(gateway.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
        } : {}),
        gatewayService: gateway.service,
        checkoutKind: "event",
        checkoutAttemptId: attemptId,
        eventId: event.id,
        ticketId: ticket.id,
        registrationId,
    };

    let charge: ChargeWithGatewayResult;
    try {
        charge = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            transactionId,
            paymentType,
            total,
            feesAmount,
            currency,
            description: `Payment for event registration - ${registrationId}`,
            note: `registrationId:${registrationId}|eventId:${event.id}|ticketId:${ticket.id}|mid:${mid}|lid:${lid}`,
            metadata: { locationId: lid, memberId: mid, registrationId, transactionId },
        });
    } catch (error) {
        if (error instanceof EventRegistrationError) throw error;
        if (error instanceof PaymentChargeError) {
            throw new EventRegistrationError(error.status, error.message, error.code);
        }
        const mapped = error instanceof Stripe.errors.StripeError
            ? handleStripeError({ error })
            : error instanceof SquareError
                ? handleSquareError(error)
                : { code: "PAYMENT_FAILED", message: "Unable to process payment" };
        throw new EventRegistrationError(400, mapped.message, mapped.code);
    }

    switch (charge.status) {
        case "approved": {
            const now = new Date();
            return db.transaction(async (tx) => {
                const [transaction] = await tx.insert(transactions).values({
                    id: transactionId,
                    description,
                    total,
                    subTotal,
                    tax,
                    type: "inbound",
                    status: "paid",
                    locationId: lid,
                    memberId: mid,
                    paymentMethodId,
                    paymentType,
                    chargeDate: now,
                    feeAmount: feesAmount,
                    currency,
                    paymentIntentId: charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    activities: [{
                        at: now.toISOString(),
                        reason: "Payment succeeded",
                        paymentType: charge.paymentType ?? paymentType,
                        brand: charge.brand,
                        last4: charge.last4,
                    }],
                }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
                if (!transaction) {
                    const existingRegistration = await tx.query.eventRegistrations.findFirst({
                        where: (candidate, { eq }) => eq(candidate.transactionId, transactionId),
                    });
                    if (existingRegistration) return existingRegistration;
                    throw new EventRegistrationError(202, "Payment is being finalized; do not retry", "FULFILLMENT_PENDING");
                }
                return createEventRegistration(tx, {
                    lid,
                    mid,
                    event,
                    ticket,
                    transactionId,
                    registrationId,
                    status: "registered",
                });
            });
        }
        case "failed": {
            const now = new Date();
            await db.insert(transactions).values({
                id: transactionId,
                description,
                total,
                subTotal,
                tax,
                type: "inbound",
                status: "failed",
                locationId: lid,
                memberId: mid,
                paymentMethodId,
                paymentType,
                chargeDate: now,
                feeAmount: feesAmount,
                currency,
                paymentIntentId: charge.paymentIntentId,
                failedReason: charge.failureReason,
                failedCode: charge.failureCode,
                metadata: { ...metadata, ...charge.gatewayMetadata },
                activities: [{
                    at: now.toISOString(),
                    reason: `Payment failed: ${charge.failureReason}`,
                    paymentType: charge.paymentType ?? paymentType,
                    brand: charge.brand,
                    last4: charge.last4,
                }],
            }).onConflictDoNothing({ target: transactions.id });
            throw new EventRegistrationError(400, charge.failureReason, charge.failureCode);
        }
        case "uncertain":
            throw new EventRegistrationError(202, "Payment status is unknown; do not retry", "PAYMENT_UNCERTAIN");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
