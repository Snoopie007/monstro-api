import { db } from "@/db/db";
import type { Promo } from "@subtrees/types";
import {
    authorizeReferenceIdForTransaction,
    calculateOrderTotals,
    chargeWithGateway,
    CheckoutError,
    CheckoutPendingError,
    getAdditionalFeesForCheckout,
    getCheckoutContext,
    PaymentChargeError,
    stableCheckoutTransactionId,
    type ChargeWithGatewayResult,
} from "@/utils";
import { orders, products, productVariants, transactions } from "@subtrees/schemas";
import { and, eq, gte, inArray, sql } from "drizzle-orm";

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
    attemptId: string;
    quoteOnly?: boolean;
};

export async function handleMercCheckout(input: MercCheckoutInput) {
    const { lid, mid, items, paymentMethodId, promoId, paymentType = "card", attemptId, quoteOnly = false } = input;
    if (!items.length || items.some((item) => !Number.isSafeInteger(item.quantity) || item.quantity < 1)) {
        throw new CheckoutError(400, "Invalid items");
    }

    const transactionId = stableCheckoutTransactionId("order", lid, mid, attemptId);
    const authorizeReferenceId = authorizeReferenceIdForTransaction(transactionId);
    const orderId = `ord_${transactionId.replaceAll("-", "")}`;
    const existingTransaction = await db.query.transactions.findFirst({
        where: (tx, { and, eq }) => and(eq(tx.id, transactionId), eq(tx.locationId, lid), eq(tx.memberId, mid)),
    });
    if (existingTransaction) {
        const order = await db.query.orders.findFirst({
            where: (candidate, { eq }) => eq(candidate.transactionId, transactionId),
        });
        if (existingTransaction.status === "paid" && order) return order;
        if (existingTransaction.status === "pending") throw new CheckoutPendingError(transactionId);
        if (existingTransaction.status === "failed") {
            throw new PaymentChargeError(
                existingTransaction.failedReason || "Payment was declined",
                existingTransaction.failedCode || "PAYMENT_FAILED",
            );
        }
        throw new Error("Order payment is not complete");
    }

    const { gatewayCustomerId, locationState, taxRates, gateway } = await getCheckoutContext({ lid, mid });
    const variants = await db.select({
        id: productVariants.id,
        name: products.name,
        price: productVariants.price,
        salePrice: productVariants.salePrice,
        stock: productVariants.stock,
        active: productVariants.active,
        productActive: products.active,
    }).from(productVariants).innerJoin(
        products,
        eq(productVariants.productId, products.id),
    ).where(and(
        inArray(productVariants.id, items.map((item) => item.variantId)),
        eq(products.locationId, lid),
    ));
    if (variants.length !== items.length || variants.some((variant) =>
        !variant.active || !variant.productActive
        || variant.stock < (items.find((item) => item.variantId === variant.id)?.quantity ?? 0)
    )) throw new CheckoutError(400, "Invalid or unavailable items");

    let promoData: Pick<Promo, "redemptionCount" | "maxRedemptions" | "type" | "value"> | undefined;
    if (promoId) {
        const promo = await db.query.promos.findFirst({
            where: (p, { eq, and, gt, isNull, or }) => and(
                eq(p.id, promoId),
                eq(p.locationId, lid),
                eq(p.isActive, true),
                or(isNull(p.expiresAt), gt(p.expiresAt, new Date())),
            ),
            columns: { redemptionCount: true, maxRedemptions: true, type: true, value: true },
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

    const additionalFees = await getAdditionalFeesForCheckout(lid, "order");
    const {
        total,
        discount,
        platformFeeAmount,
        tax,
        subtotal,
        lineItems,
        additionalFeeTotal,
        additionalFeeLines,
    } = calculateOrderTotals(
        items,
        variants,
        taxRates.find((r) => r.isDefault)?.percentage || 0,
        locationState.usagePercent || 0,
        additionalFees,
        promoData,
    );
    if (quoteOnly) {
        return {
            total,
            discount,
            feesAmount: additionalFeeTotal,
            tax,
            subtotal,
            processingFee: 0,
            additionalFeeTotal,
            additionalFeeLines,
            lineItems,
        };
    }
    const currency = locationState.currency;
    const description = `Payment for order ${orderId}`;
    const metadata: Record<string, unknown> = {
        gatewayService: gateway.service,
        ...(gateway.service === "authorize" ? {
            authorizeIntegrationId: gateway.integrationId,
            authorizeReferenceId,
        } : {}),
        checkoutKind: "order",
        checkoutAttemptId: attemptId,
        orderId,
    };
    const transactionItems = [
        ...lineItems.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            price: item.unitCost,
            productId: item.variantId,
            tax: item.tax,
        })),
        ...additionalFeeLines,
    ];
    const charge: ChargeWithGatewayResult = await chargeWithGateway({
        gateway,
        gatewayCustomerId,
        paymentMethodId,
        transactionId,
        authorizeReferenceId,
        paymentType,
        total,
        feesAmount: platformFeeAmount,
        currency,
        description,
        referenceId: orderId,
        note: `orderId:${orderId}|mid:${mid}|locationId:${lid}`,
        metadata: { memberId: mid, locationId: lid, orderId, transactionId },
    });

    switch (charge.status) {
        case "approved": {
            const now = new Date();
            return db.transaction(async (tx) => {
                const [created] = await tx.insert(transactions).values({
                    id: transactionId,
                    memberId: mid,
                    locationId: lid,
                    description,
                    type: "inbound",
                    paymentType,
                    paymentMethodId,
                    total,
                    subTotal: subtotal,
                    tax,
                    feeAmount: platformFeeAmount,
                    items: transactionItems,
                    currency,
                    status: "paid",
                    chargeDate: now,
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
                if (!created) {
                    const current = await tx.query.orders.findFirst({
                        where: (candidate, { eq }) => eq(candidate.transactionId, transactionId),
                    });
                    if (current?.status === "paid") return current;
                    throw new CheckoutPendingError(transactionId, "Payment is being finalized; do not retry");
                }

                // ponytail: recheck after charging; add stock reservations if concurrent sellouts become possible.
                for (const item of items.toSorted((a, b) => a.variantId.localeCompare(b.variantId))) {
                    const [decremented] = await tx.update(productVariants).set({
                        stock: sql`${productVariants.stock} - ${item.quantity}`,
                        updated: now,
                    }).where(and(
                        eq(productVariants.id, item.variantId),
                        gte(productVariants.stock, item.quantity),
                    )).returning({ id: productVariants.id });
                    if (!decremented) {
                        throw new CheckoutError(400, "Item inventory changed during checkout");
                    }
                }

                const [order] = await tx.insert(orders).values({
                    id: orderId,
                    memberId: mid,
                    locationId: lid,
                    transactionId,
                    trackingNumber: Math.floor(1000000000 + Math.random() * 9000000000),
                    status: "paid",
                    subtotal,
                    tax,
                    total,
                    items: lineItems,
                    processingFee: 0,
                    gatewayPaymentId: charge.paymentIntentId,
                }).returning();
                if (!order) throw new Error("Failed to create order");
                return order;
            });
        }
        case "failed": {
            const now = new Date();
            await db.insert(transactions).values({
                id: transactionId,
                memberId: mid,
                locationId: lid,
                description,
                type: "inbound",
                paymentType,
                paymentMethodId,
                total,
                subTotal: subtotal,
                tax,
                feeAmount: platformFeeAmount,
                items: transactionItems,
                currency,
                status: "failed",
                chargeDate: now,
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
            throw new PaymentChargeError(charge.failureReason, charge.failureCode);
        }
        case "uncertain":
            throw new CheckoutPendingError(transactionId, "Payment status is unknown; do not retry");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
