import { db } from "@/db/db";
import type { Promo } from "@subtrees/types";
import {
    calculateOrderTotals,
    chargeWithGateway,
    getCheckoutContext,
} from "@/utils";
import { orders, transactions } from "@subtrees/schemas";
import { generateUUID } from "@subtrees/utils/generateUUID";

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
    paymentType?: "card" | "us_bank_account";
};

export async function handleMercCheckout(input: MercCheckoutInput) {
    const { lid, mid, items, paymentMethodId, promoId, paymentType = "card" } = input;

    if (!items.length) {
        throw new Error("No items provided");
    }

    const {
        gatewayCustomerId,
        ml,
        taxRates,
        gateway,
    } = await getCheckoutContext({ lid, mid });

    const locationState = ml.location.locationState;
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

    const orderId = generateUUID('ord_');
    const transactionId = generateUUID('txn_');
    const description = `Payment for order ${orderId}`;

    let paymentIntentId: string;
    let gatewayMetadata: Record<string, unknown> = {
        gatewayService: gateway.service,
        orderId,
        transactionId,
    };

    try {
        const charge = await chargeWithGateway({
            gateway,
            gatewayCustomerId,
            paymentMethodId,
            paymentType,
            total,
            feesAmount,
            currency,
            description,
            referenceId: orderId,
            note: `orderId:${orderId}|transactionId:${transactionId}|mid:${mid}|locationId:${lid}`,
            metadata: {
                memberId: mid,
                locationId: lid,
                orderId,
                transactionId,
            },
        });
        paymentIntentId = charge.paymentIntentId;
        gatewayMetadata = {
            ...gatewayMetadata,
            ...charge.gatewayMetadata,
        };
    } catch (error) {
        console.error(error);
        throw error;
    }

    const now = new Date();

    return db.transaction(async (tx) => {
        const [transaction] = await tx.insert(transactions).values({
            id: transactionId,
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
            paymentType,
            chargeDate: now,
            feeAmount: feesAmount,
            currency,
            metadata: gatewayMetadata,
        }).returning({ id: transactions.id });

        if (!transaction) {
            throw new Error("Failed to create transaction");
        }

        const [order] = await tx.insert(orders).values({
            id: orderId,
            memberId: mid,
            locationId: lid,
            trackingNumber: Math.floor(1000000000 + Math.random() * 9000000000),
            status: "paid",
            transactionId: transaction.id,
            subtotal,
            tax,
            total,
            items: lineItems,
            processingFee,
            gatewayPaymentId: paymentIntentId,
        }).returning();

        if (!order) {
            tx.rollback();
            throw new Error("Failed to create order");
        }

        return order;
    });
}
