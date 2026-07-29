import { db } from "@/db/db";
import { calculateChargeDetails, chargeWithGateway, getCheckoutContext, PaymentChargeError, type ChargeWithGatewayResult } from "@/utils";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
import { transactions } from "@subtrees/schemas";
import { generateUUID } from "@subtrees/utils/generateUUID";
import { SquareError } from "square";
import Stripe from "stripe";
import {
    createEventRegistration,
    EventRegistrationError,
    loadEventRegistrationContext,
    type LoadEventContextParams,
} from "./shared";

type HandlePaidEventRegistrationProps = LoadEventContextParams & { paymentMethodId: string; paymentType?: "card" | "us_bank_account" };

export async function handlePaidEventRegistration(props: HandlePaidEventRegistrationProps) {
    const { lid, mid, paymentMethodId, paymentType = "card" } = props;

    const { event, ticket } = await loadEventRegistrationContext(props);

    if (ticket.pricingMethod === "free" || ticket.price <= 0) {
        throw new EventRegistrationError(400, "This ticket is free");
    }

    const {
        gatewayCustomerId,
        ml,
        taxRates,
        gateway,
    } = await getCheckoutContext({ lid, mid });

    const locationState = ml.location.locationState;
    const taxRate = taxRates.find((r) => r.isDefault)?.percentage || 0;
    const { currency } = locationState;
    const description = `${event.name} - ${ticket.name}`;
    const passOnFees = locationState.settings?.passOnFees || false;
    const usagePercent = locationState.usagePercent || 0;

    const { total, feesAmount, tax, subTotal } = calculateChargeDetails({
        amount: ticket.price,
        taxRate,
        passOnFees,
        usagePercent,
        paymentType,
        isRecurring: false,
    });

    const registrationId = generateUUID("erg_");

    let paymentIntentId: string;
    let gatewayMetadata: Record<string, unknown> = {
        gatewayService: gateway.service,
        eventId: event.id,
        ticketId: ticket.id,
        registrationId,
    };
    let chargeResult: ChargeWithGatewayResult | undefined;
    try {
        const note = `ticketId:${ticket.id}|mid:${mid}|lid:${lid}|pmid:${paymentMethodId}`;

        chargeResult = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            paymentType,
            total,
            feesAmount,
            currency,
            description: `Payment for event registration - ${registrationId}`,
            referenceId: registrationId,
            note,
            metadata: {
                locationId: lid,
                memberId: mid,
                registrationId,
            },
        });
    } catch (error) {
        if (error instanceof EventRegistrationError) {
            throw error;
        }
        if (error instanceof PaymentChargeError) {
            throw new EventRegistrationError(error.status, error.message, error.code);
        }
        const mapped = error instanceof Stripe.errors.StripeError
            ? handleStripeError({ error })
            : error instanceof SquareError
                ? handleSquareError(error)
                : { code: "UNKNOWN_ERROR", message: "unable to process payment" };
        throw new EventRegistrationError(400, mapped.message, mapped.code);
    }

    const now = new Date();
    if (!chargeResult) {
        throw new Error("Failed to charge");
    }
    return db.transaction(async (tx) => {
        const [transaction] = await tx.insert(transactions).values({
            description,
            total,
            subTotal,
            tax,
            type: "inbound",
            status: "paid",
            locationId: lid,
            memberId: mid,
            paymentMethodId,
            paymentIntentId: chargeResult.paymentIntentId,
            paymentType,
            chargeDate: now,
            feeAmount: feesAmount,
            currency,
            activities: [{
                at: now.toISOString(),
                reason: "Payment succeeded",
                paymentType,
                brand: chargeResult.brand,
                last4: chargeResult.last4,
            }],
            metadata: {
                registrationId,
            },
        }).returning({ id: transactions.id });

        if (!transaction) {
            throw new EventRegistrationError(500, "Unable to create transaction");
        }

        return createEventRegistration(tx, {
            lid,
            mid,
            event,
            ticket,
            transactionId: transaction.id,
            registrationId,
        });
    });
}
