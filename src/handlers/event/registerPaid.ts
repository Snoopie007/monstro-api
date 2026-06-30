import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { calculateGatewayFeeAmount } from "@/utils";
import { handleSquareError, handleStripeError } from "@/utils/paymentErrors";
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
    const { lid, mid, eventId, ticketId, paymentMethodId, paymentType = "card" } = props;

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


    const description = `${event.name} - ${ticket.name}`;

    const passOnFees = locationState.settings?.passOnFees || false;
    const usagePercent = locationState.usagePercent || 0;

    const subtotal = ticket.price;
    const tax = Math.floor((subtotal * taxRate) / 100);
    let total = subtotal + tax;
    let processingFee = 0;
    let feesAmount = 0;


    if (passOnFees) {
        processingFee = calculateGatewayFeeAmount(subtotal, 'card', false);
        total += processingFee;
    }

    if (usagePercent > 0) {
        feesAmount = Math.floor((subtotal * usagePercent) / 100);
        total += feesAmount;
    }

    const productName = `${event.name} - ${ticket.name}`;
    return db.transaction(async (tx) => {
        const registration = await createEventRegistration(tx, {
            lid,
            mid,
            event,
            ticket,
        });

        try {
            if (!gateway?.accessToken) {
                throw new EventRegistrationError(400, "No payment gateway found for this location");
            }
            if (!gatewayCustomerId) {
                throw new EventRegistrationError(400, "No gateway customer found for this location");
            }

            if (gateway.service === "stripe") {
                const stripe = new StripePaymentGateway(gateway.accessToken);

                await stripe.createCharge(gatewayCustomerId, paymentMethodId, {
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
                        registrationId: registration.id
                    },
                });
            } else if (gateway.service === "square") {
                if (paymentType !== "card") {
                    throw new EventRegistrationError(400, "Square only supports saved card payments here");
                }
                const squareLocationId = gateway.metadata?.squareLocationId;
                if (!squareLocationId) {
                    throw new EventRegistrationError(400, "Square location ID not found");
                }
                const square = new SquarePaymentGateway(gateway.accessToken);

                await square.createCharge(gatewayCustomerId, paymentMethodId, {
                    total,
                    feesAmount,
                    currency,
                    referenceId: registration.id,
                    squareLocationId,
                    note: `registrationId:${registration.id}|mid:${mid}|lid:${lid}|pmid:${paymentMethodId}`,
                });

            } else {
                await tx.rollback();
                throw new EventRegistrationError(400,
                    "No payment gateway configured for this location", "NO_PAYMENT_GATEWAY",
                );
            }



        } catch (error) {
            await tx.rollback();
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

        return registration;
    });
}
