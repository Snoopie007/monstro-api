import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateChargeDetails, getCheckoutContext } from "@/utils";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
import { transactions } from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
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
        locationState,
        taxRates,
        gateway,
    } = await getCheckoutContext({ lid, mid });

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

    try {
        if (gateway.service === "stripe") {
            const stripe = new StripePaymentGateway(gateway.accessToken);
            const paymentResult = await stripe.createChargeWithoutLineItems(
                gatewayCustomerId,
                paymentMethodId,
                {
                    authorizeOnly: true,
                    description: `Payment for event registration - ${registrationId}`,
                    total,
                    feesAmount,
                    currency,
                    metadata: {
                        locationId: lid,
                        memberId: mid,
                        registrationId,
                    },
                });
            paymentIntentId = paymentResult.id;
        } else if (gateway.service === "square") {
            if (paymentType !== "card") {
                throw new EventRegistrationError(400, "Square only supports saved card payments here");
            }
            const squareLocationId = gateway.metadata?.squareLocationId;
            if (!squareLocationId) {
                throw new EventRegistrationError(400, "Square location ID not found");
            }
            const square = new SquarePaymentGateway(gateway.accessToken);
            const payment = await square.createCharge(gatewayCustomerId, paymentMethodId, {
                total,
                feesAmount,
                currency,
                referenceId: registrationId,
                squareLocationId,
                note: `registrationId:${registrationId}|eventId:${event.id}|ticketId:${ticket.id}|mid:${mid}|lid:${lid}|pmid:${paymentMethodId}`,
            });

            if (!payment?.id) {
                throw new EventRegistrationError(400, "Payment was not created");
            }

            const status = (payment.status || "").toUpperCase();
            if (status !== "COMPLETED") {
                throw new EventRegistrationError(400, "Payment was not completed", "PAYMENT_INCOMPLETE");
            }

            paymentIntentId = payment.id;
            gatewayMetadata = {
                ...gatewayMetadata,
                squarePaymentId: payment.id,
                squarePaymentStatus: payment.status,
            };
        } else {
            throw new EventRegistrationError(
                400,
                "No payment gateway configured for this location",
                "NO_PAYMENT_GATEWAY",
            );
        }
    } catch (error) {

        if (error instanceof EventRegistrationError) {
            throw error;
        }
        const mapped = error instanceof Stripe.errors.StripeError
            ? handleStripeError({ error })
            : error instanceof SquareError
                ? handleSquareError(error)
                : { code: "UNKNOWN_ERROR", message: "unable to process payment" };
        throw new EventRegistrationError(400, mapped.message, mapped.code);
    }

    const now = new Date();

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
            paymentIntentId,
            paymentType,
            chargeDate: now,
            feeAmount: feesAmount,
            currency,
            metadata: gatewayMetadata,
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
