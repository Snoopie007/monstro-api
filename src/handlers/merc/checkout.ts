import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import type { Promo } from "@subtrees/types";
import {
    calculateOrderTotals,
    chargeWithGateway,
    CheckoutPendingError,
    getCheckoutContext,
    PaymentChargeError,
    stableCheckoutTransactionId,
    type ChargeWithGatewayResult,
} from "@/utils";
import { orders, transactions } from "@subtrees/schemas";


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
};

export async function handleMercCheckout(input: MercCheckoutInput) {
    const { lid, mid, items, paymentMethodId, promoId, paymentType = "card", attemptId } = input;
    if (!items.length) throw new Error("No items provided");

    const transactionId = stableCheckoutTransactionId("order", lid, mid, attemptId);
    const existingTransaction = await db.query.transactions.findFirst({
        where: (tx, { and, eq }) => and(eq(tx.id, transactionId), eq(tx.locationId, lid), eq(tx.memberId, mid)),
    });
    if (existingTransaction) {
        const order = await db.query.orders.findFirst({ where: (candidate, { eq }) => eq(candidate.transactionId, transactionId) });
        if (existingTransaction.status === "paid" && order) return order;
        if (existingTransaction.status === "pending") throw new CheckoutPendingError(transactionId);
        if (existingTransaction.status === "failed") {
            throw new PaymentChargeError(existingTransaction.failedReason || "Payment was declined", existingTransaction.failedCode || "PAYMENT_FAILED");
        }
        throw new Error("Order payment is not complete");
    }

    const { gatewayCustomerId, locationState, taxRates, gateway } = await getCheckoutContext({ lid, mid });
    const variants = await db.query.productVariants.findMany({
        where: (v, { inArray }) => inArray(v.id, items.map((item) => item.variantId)),
        columns: { id: true, name: true, price: true },
    });
    if (variants.length !== items.length) throw new Error("Invalid items");

    let promoData: Pick<Promo, "redemptionCount" | "maxRedemptions" | "type" | "value"> | undefined;
    if (promoId) {
        const promo = await db.query.promos.findFirst({
            where: (p, { eq, and, gt, isNull, or }) => and(
                eq(p.id, promoId),
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

    const { total, feesAmount, tax, subtotal, processingFee, lineItems } = calculateOrderTotals(
        items,
        variants,
        taxRates.find((r) => r.isDefault)?.percentage || 0,
        locationState.settings?.passOnFees || false,
        locationState.usagePercent || 0,
        promoData,
    );
    const currency = locationState.currency;
    const metadata: Record<string, unknown> = {
        gatewayService: gateway.service,
        ...(gateway.service === "authorize" ? { authorizeIntegrationId: gateway.integrationId } : {}),
        checkoutKind: "order",
        checkoutAttemptId: attemptId,
    };

    const order = await db.transaction(async (tx) => {
        const [createdTransaction] = await tx.insert(transactions).values({
            id: transactionId,
            memberId: mid,
            locationId: lid,
            description: `Payment for order attempt ${attemptId}`,
            type: "inbound",
            paymentType,
            paymentMethodId,
            total,
            subTotal: subtotal,
            tax,
            feeAmount: feesAmount,
            currency,
            status: "pending",
            metadata,
        }).onConflictDoNothing({ target: transactions.id }).returning({ id: transactions.id });
        if (!createdTransaction) throw new CheckoutPendingError(transactionId);

        const [createdOrder] = await tx.insert(orders).values({
            memberId: mid,
            locationId: lid,
            transactionId,
            trackingNumber: Math.floor(1000000000 + Math.random() * 9000000000),
            status: "pending",
            subtotal,
            tax,
            total,
            items: lineItems,
            processingFee,
        }).returning();
        if (!createdOrder) throw new Error("Failed to create order");
        return createdOrder;
    });

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
            description: `Payment for order ${order.id}`,
            referenceId: order.id,
            note: `orderId:${order.id}|mid:${mid}|locationId:${lid}`,
            metadata: { memberId: mid, locationId: lid, orderId: order.id, transactionId },
        });
    } catch (error) {
        await db.transaction(async (tx) => {
            await tx.update(transactions).set({
                status: "failed",
                failedReason: error instanceof Error ? error.message : "Payment failed",
                failedCode: error instanceof PaymentChargeError ? error.code || "PAYMENT_FAILED" : "PAYMENT_FAILED",
                updated: new Date(),
            }).where(eq(transactions.id, transactionId));
            await tx.update(orders).set({ status: "cancelled", updated: new Date() }).where(eq(orders.id, order.id));
        });
        throw error;
    }

    switch (charge.status) {
        case "approved": {
            const paidOrder = await db.transaction(async (tx) => {
                const [updated] = await tx.update(transactions).set({
                    status: "paid",
                    paymentIntentId: charge.paymentIntentId,
                    metadata: { ...metadata, ...charge.gatewayMetadata },
                    updated: new Date(),
                }).where(and(eq(transactions.id, transactionId), eq(transactions.status, "pending"))).returning({ id: transactions.id });
                if (!updated) {
                    const current = await tx.query.orders.findFirst({
                        where: eq(orders.transactionId, transactionId),
                    });
                    if (current?.status === "paid") return current;
                    throw new CheckoutPendingError(transactionId, "Payment is being finalized; do not retry");
                }
                const [result] = await tx.update(orders).set({
                    status: "paid",
                    gatewayPaymentId: charge.paymentIntentId,
                    updated: new Date(),
                }).where(eq(orders.id, order.id)).returning();
                if (!result) throw new Error("Failed to mark order paid");
                return result;
            });
            return paidOrder;
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
                await tx.update(orders).set({ status: "cancelled", updated: new Date() }).where(eq(orders.id, order.id));
            });
            throw new PaymentChargeError(charge.failureReason, charge.failureCode);
        case "held":
        case "uncertain":
            await db.transaction(async (tx) => {
                await tx.update(transactions).set({
                    status: "pending",
                    ...(charge.status === "held" && charge.paymentIntentId ? { paymentIntentId: charge.paymentIntentId } : {}),
                    metadata: { ...metadata, ...charge.gatewayMetadata, ...(charge.status === "held" ? { authorizeHeld: true } : { paymentUncertain: true }) },
                    updated: new Date(),
                }).where(eq(transactions.id, transactionId));
                await tx.update(orders).set({ status: "pending", updated: new Date() }).where(eq(orders.id, order.id));
            });
            throw new CheckoutPendingError(transactionId, charge.status === "held" ? "Payment is pending; do not retry" : "Payment status is unknown; do not retry");
        default: {
            const exhaustive: never = charge;
            throw new Error(`Unknown payment result: ${exhaustive}`);
        }
    }
}
