import { db } from "@/db/db";
import type { Promo } from "@subtrees/types";
import {
    calculateOrderTotals,
    fetchMercCheckoutContext,
} from "@/utils";
import { orders } from "@subtrees/schemas";
import { StripePaymentGateway, SquarePaymentGateway } from "@/libs/PaymentGateway";

export type MercCheckoutItem = {
    variantId: string;
    quantity: number;
};

export type MercCheckoutInput = {
    lid: string;
    mid: string;
    items: MercCheckoutItem[];
    paymentMethodId: string;
    promoId?: string | null;
};

export async function handleMercCheckout(input: MercCheckoutInput) {
    const { lid, mid, items, paymentMethodId, promoId } = input;

    if (!items.length) {
        throw new Error("No items provided");
    }

    const {
        gatewayCustomerId,
        locationState,
        taxRates,
        gateway,
    } = await fetchMercCheckoutContext({ lid, mid });

    const variants = await db.query.productVariants.findMany({
        where: (v, { inArray }) => inArray(v.id, items.map((item) => item.variantId)),
        columns: {
            id: true,
            name: true,
            price: true,
        },
    });

    if (variants.length !== items.length) {
        throw new Error("Invalid items");
    }

    const taxRate = taxRates.find((r) => r.isDefault)?.percentage || 0;

    let promoData: Pick<Promo, "redemptionCount" | "maxRedemptions" | "type" | "value"> | undefined;
    if (promoId) {
        const promo = await db.query.promos.findFirst({
            where: (p, { eq, and, gt, isNull, or }) => and(
                eq(p.id, promoId),
                eq(p.isActive, true),
                or(
                    isNull(p.expiresAt),
                    gt(p.expiresAt, new Date()),
                ),
            ),
            columns: {
                redemptionCount: true,
                maxRedemptions: true,
                type: true,
                value: true,
            },
        });
        if (promo) {
            promoData = {
                redemptionCount: promo.redemptionCount,
                maxRedemptions: promo.maxRedemptions,
                type: promo.type,
                value: promo.value,
            };
        }
    }

    const passOnFees = locationState.settings?.passOnFees || false;
    const usagePercent = locationState.usagePercent || 0;

    const { total, feesAmount, tax, subtotal, processingFee, lineItems } = calculateOrderTotals(
        items,
        variants,
        taxRate,
        passOnFees,
        usagePercent,
        promoData,
    );
    const currency = locationState.currency;

    return db.transaction(async (tx) => {
        const [order] = await tx.insert(orders).values({
            memberId: mid,
            locationId: lid,
            trackingNumber: Math.floor(1000000000 + Math.random() * 9000000000),
            status: "pending",
            subtotal,
            tax,
            total,
            items: lineItems,
            processingFee,
        }).returning();

        if (!order) {
            throw new Error("Failed to create order");
        }

        if (gateway.service === "stripe") {
            try {
                const stripe = new StripePaymentGateway(gateway.accessToken);
                await stripe.createChargeWithoutLineItems(
                    gatewayCustomerId,
                    paymentMethodId,
                    {
                        authorizeOnly: true,
                        description: `Payment for order ${order.id}`,
                        total,
                        currency,
                        feesAmount,
                        metadata: {
                            memberId: mid,
                            locationId: lid,
                            orderId: order.id,
                        },
                    });
            } catch (error) {
                console.error(error);
                tx.rollback();
                throw error;
            }
        }

        if (gateway.service === "square") {
            try {
                const square = new SquarePaymentGateway(gateway.accessToken);
                const squareLocationId = gateway.metadata?.squareLocationId;
                if (!squareLocationId) {
                    throw new Error("Square location ID not found");
                }
                await square.createCharge(gatewayCustomerId, paymentMethodId, {
                    total,
                    feesAmount,
                    currency,
                    referenceId: `${order.id}`,
                    squareLocationId,
                    note: `orderId:${order.id}|mid:${mid}|locationId:${lid}`,
                });
            } catch (error) {
                console.error(error);
                tx.rollback();
                throw error;
            }
        }

        return order;
    });
}
