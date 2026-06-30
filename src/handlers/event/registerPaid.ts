import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateGatewayFeeAmount } from "@/utils";
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

    const { event, ticket, memberLocation } = await loadEventRegistrationContext(props);

    if (ticket.pricingMethod === "free" || ticket.price <= 0) {
        throw new EventRegistrationError(400, "This ticket is free");
    }

    const { gatewayCustomerId } = memberLocation;

    const location = await db.query.locations.findFirst({
        where: (l, { eq }) => eq(l.id, lid),
        with: {
            locationState: true,
            taxRates: true,
        },
    });

    const locationState = location?.locationState;
    const taxRate = location?.taxRates.find((r) => r.isDefault)?.percentage || 0;

    if (!locationState) {
        throw new EventRegistrationError(400, "No location state found for this location");
    }
    const { paymentGatewayId, currency } = locationState;

    if (!paymentGatewayId) {
        throw new EventRegistrationError(400, "No payment gateway set for this location");
    }

    const gateway = await db.query.integrations.findFirst({
        where: (g, { eq }) => eq(g.id, paymentGatewayId),
        columns: {
            service: true,
            accessToken: true,
            metadata: true,
        },
    });

    if (!gateway?.accessToken) {
        throw new EventRegistrationError(400, "No payment gateway found for this location");
    }
    if (!gatewayCustomerId) {
        throw new EventRegistrationError(400, "No gateway customer found for this location");
    }

    const description = `${event.name} - ${ticket.name}`;
    const passOnFees = locationState.settings?.passOnFees || false;
    const usagePercent = locationState.usagePercent || 0;

    const subtotal = ticket.price;
    const tax = Math.floor((subtotal * taxRate) / 100);
    let total = subtotal + tax;
    let processingFee = 0;
    let feesAmount = 0;

    if (passOnFees) {
        processingFee = calculateGatewayFeeAmount(subtotal, "card", false);
        total += processingFee;
    }

    if (usagePercent > 0) {
        feesAmount = Math.floor((subtotal * usagePercent) / 100);
        total += feesAmount;
    }

    const productName = `${event.name} - ${ticket.name}`;
    const resolvedPaymentType: PaymentType = paymentType === "us_bank_account" ? "us_bank_account" : "card";
    const feeAmount = feesAmount + processingFee;
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
            const paymentResult = await stripe.createCharge(gatewayCustomerId, paymentMethodId, {
                total,
                unitCost: total,
                tax,
                feesAmount,
                currency,
                description,
                productName,
                metadata: {
                    locationId: lid,
                    memberId: mid,
                    eventId: event.id,
                    ticketId: ticket.id,
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
            subTotal: subtotal,
            tax,
            type: "inbound",
            status: "paid",
            locationId: lid,
            memberId: mid,
            paymentMethodId,
            paymentIntentId,
            paymentType: resolvedPaymentType,
            chargeDate: now,
            feeAmount,
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
