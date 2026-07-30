import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import type { PaymentType } from "@subtrees/types";
import { orders, transactions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

interface HandleSquareOrderFailProps {
    orderId: string;
    paymentMethodId: string;
    paymentIntentId: string;
    paymentType: PaymentType;
    feeAmount: number;
    amount: number;
    failedReason?: string;
    failedCode?: string;
    stripeChargeId?: string;
}

export async function handleSquareOrderFail({ orderId, paymentMethodId, paymentIntentId, paymentType, feeAmount, amount, failedReason, failedCode, stripeChargeId }: HandleSquareOrderFailProps) {
    await db.transaction(async (tx) => {
        const order = await tx.query.orders.findFirst({
            where: eq(orders.id, orderId),
        });
        assert(order, "Order not found");

        const [transaction] = await tx.insert(transactions).values({
            paymentMethodId,
            paymentIntentId,
            locationId: order.locationId,
            memberId: order.memberId,
            paymentType,
            feeAmount,
            total: amount,
            type: "inbound",
            status: "failed",
            failedReason,
            failedCode,
            metadata: {
                gatewayService: "stripe",
                stripeChargeId,
            },
        }).returning({ id: transactions.id });
        assert(transaction);

        await tx.update(orders).set({
            status: "unpaid",
            transactionId: transaction.id,
            updated: new Date(),
        }).where(eq(orders.id, orderId));
    });
}