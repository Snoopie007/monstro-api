import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import type { PaymentType } from "@subtrees/types";
import { orders, transactions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { queueOrderPaidNotifications } from "@/utils/orderEmailNotifications";

interface HandleStripeOrderChargeProps {
    orderId: string;
    locationId: string;
    memberId: string;
    paymentType: PaymentType;
    failedReason: string | null;
    failedCode: string | null;
    success: boolean;
    amount: number;
    paymentMethodId: string | null;
    paymentIntentId: string | null;
    feeAmount: number;
    stripeChargeId: string | null;
}
export async function handleStripeOrderCharge({
    orderId,
    locationId,
    memberId,
    paymentType,
    failedReason,
    failedCode,
    success,
    amount,
    paymentMethodId,
    paymentIntentId,
    feeAmount,
    stripeChargeId,
}: HandleStripeOrderChargeProps) {
    const previousOrder = await db.query.orders.findFirst({
        where: eq(orders.id, orderId),
        with: {
            member: true,
            location: {
                with: {
                    vendor: {
                        with: {
                            user: true,
                        },
                    },
                },
            },
        },
    });
    assert(previousOrder, "Order not found");

    const order = await db.transaction(async (tx) => {
        const [transaction] = await tx.insert(transactions).values({
            locationId,
            memberId,
            paymentMethodId,
            paymentIntentId: paymentIntentId || undefined,
            paymentType,
            feeAmount,
            total: amount,
            type: "inbound",
            status: success ? "paid" : "failed",
            failedReason,
            failedCode,
            metadata: {
                gatewayService: "stripe",
                stripeChargeId: stripeChargeId || undefined,
            },
        }).returning({ id: transactions.id });
        assert(transaction);

        const [updatedOrder] = await tx.update(orders).set({
            status: success ? "paid" : "unpaid",
            transactionId: transaction.id,
            updated: new Date(),
        }).where(eq(orders.id, orderId)).returning();
        assert(updatedOrder);
        return updatedOrder;
    });

    if (!success) return;

    await queueOrderPaidNotifications({
        order,
        member: previousOrder.member,
        location: previousOrder.location,
    });
}
