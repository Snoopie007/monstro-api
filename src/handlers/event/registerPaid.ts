import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import {
    calculateChargeDetails,
    chargeWithGateway,
    getCheckoutContext,
    PaymentChargeError,
    stableCheckoutTransactionId,
    type ChargeWithGatewayResult,
} from "@/utils";
import { eventRegistrations, transactions } from "@subtrees/schemas";
import { generateUUID } from "@subtrees/utils/generateUUID";
import { SquareError } from "square";
import Stripe from "stripe";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
import {
    cancelPendingEventRegistration,
    completePendingEventRegistration,
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
    const transactionId = stableCheckoutTransactionId("event", lid, mid, attemptId);
    const existing = await db.query.transactions.findFirst({
        where: (tx, { and, eq }) => and(eq(tx.id, transactionId), eq(tx.locationId, lid), eq(tx.memberId, mid)),
    });
    if (existing) {
        if (existing.status === "pending") throw new EventRegistrationError(202, "Payment is pending; do not retry", "PAYMENT_PENDING");
        if (existing.status === "failed") throw new EventRegistrationError(400, existing.failedReason || "Payment was declined", existing.failedCode || "PAYMENT_FAILED");
        if (existing.status !== "paid") throw new EventRegistrationError(500, "Unexpected transaction status");
        const registration = await db.query.eventRegistrations.findFirst({
            where: (candidate, { eq }) => eq(candidate.transactionId, transactionId),
        });
        if (!registration) throw new EventRegistrationError(202, "Payment is paid and registration is being finalized", "FULFILLMENT_PENDING");
        return registration;
    }

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
    const metadata: Record<string, unknown> = {
        ...(gateway.service === "authorize" ? { authorizeIntegrationId: gateway.integrationId } : {}),
        gatewayService: gateway.service,
        checkoutKind: "event",
        checkoutAttemptId: attemptId,
        eventId: event.id,
        ticketId: ticket.id,
    };

    const created = await db.transaction(async (tx) => {
        const [pendingTransaction] = await tx.insert(transactions).values({
            id: transactionId,
            description,
            total,
            subTotal,
            tax,
            type: "inbound",
            status: "pending",
            locationId: lid,
            memberId: mid,
            paymentMethodId,
            paymentType,
            feeAmount: feesAmount,
            currency,
            metadata,
        }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
        if (!pendingTransaction) return false;

        await createEventRegistration(tx, {
            lid,
            mid,
            event,
            ticket,
            transactionId,
            registrationId: generateUUID("erg_"),
            status: "pending",
        });
        return true;
    });
    if (!created) throw new EventRegistrationError(202, "Payment is pending; do not retry", "PAYMENT_PENDING");

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
            description: `Payment for event registration - ${transactionId}`,
            referenceId: transactionId,
            note: `registrationId:${transactionId}|eventId:${event.id}|ticketId:${ticket.id}|mid:${mid}|lid:${lid}`,
            metadata: { locationId: lid, memberId: mid, transactionId },
        });
    } catch (error) {
        await db.transaction(async (tx) => {
            await tx.update(transactions).set({
                status: "failed",
                failedReason: error instanceof Error ? error.message : "Payment failed",
                failedCode: error instanceof PaymentChargeError ? error.code || "PAYMENT_FAILED" : "PAYMENT_FAILED",
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            await cancelPendingEventRegistration(tx, transactionId);
        });
        if (error instanceof EventRegistrationError) throw error;
        if (error instanceof PaymentChargeError) throw new EventRegistrationError(400, error.message, error.code);
        const mapped = error instanceof Stripe.errors.StripeError
            ? handleStripeError({ error })
            : error instanceof SquareError
                ? handleSquareError(error)
                : { code: "PAYMENT_FAILED", message: "Unable to process payment" };
        throw new EventRegistrationError(400, mapped.message, mapped.code);
    }

    switch (charge.status) {
        case "approved": {
            return db.transaction(async (tx) => {
                const registration = await completePendingEventRegistration(tx, transactionId)
                    ?? await tx.query.eventRegistrations.findFirst({
                        where: eq(eventRegistrations.transactionId, transactionId),
                    });
                if (!registration) throw new EventRegistrationError(500, "Reserved event registration is missing");
                await tx.update(transactions).set({
                    status: "paid",
                    paymentIntentId: charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    updated: new Date(),
                }).where(and(eq(transactions.id, transactionId), eq(transactions.status, "pending")));
                return registration;
            });
        }
        case "failed":
            await db.transaction(async (tx) => {
                await tx.update(transactions).set({
                    status: "failed",
                    paymentIntentId: charge.paymentIntentId,
                    failedReason: charge.failureReason,
                    failedCode: charge.failureCode,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    updated: new Date(),
                }).where(eq(transactions.id, transactionId));
                await cancelPendingEventRegistration(tx, transactionId);
            });
            throw new EventRegistrationError(400, charge.failureReason, charge.failureCode);
        case "held":
        case "uncertain":
            await db.update(transactions).set({
                status: "pending",
                ...(charge.status === "held" && charge.paymentIntentId ? { paymentIntentId: charge.paymentIntentId } : {}),
                metadata: { ...metadata, ...charge.gatewayMetadata, ...(charge.status === "held" ? { authorizeHeld: true } : { paymentUncertain: true }) },
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            throw new EventRegistrationError(202, charge.status === "held" ? "Payment is pending; do not retry" : "Payment status is unknown; do not retry", charge.status === "held" ? "PAYMENT_PENDING" : "PAYMENT_UNCERTAIN");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
