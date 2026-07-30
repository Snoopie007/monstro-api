import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import type { PaymentType } from "@subtrees/types";
import { orders, transactions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { queueOrderPaidNotifications } from "@/utils/orderEmailNotifications";

interface HandleSquareOrderSuccessProps {
    orderId: string;
    paymentMethodId: string;
    paymentIntentId: string;
    paymentType: PaymentType;
    feeAmount: number;
    amount: number;
}

export async function handleSquareOrderSuccess({ orderId, paymentMethodId, paymentIntentId, paymentType, feeAmount, amount }: HandleSquareOrderSuccessProps) {
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
            locationId: previousOrder.locationId,
            memberId: previousOrder.memberId,
            paymentMethodId,
            paymentIntentId,
            paymentType,
            feeAmount,
            total: amount,
            type: "inbound",
            status: "paid",
            metadata: {
                gatewayService: "square",
            },
        }).returning({ id: transactions.id });
        assert(transaction);

        const [updatedOrder] = await tx.update(orders).set({
            status: "paid",
            transactionId: transaction.id,
            updated: new Date(),
        }).where(eq(orders.id, orderId)).returning();
        assert(updatedOrder);
        return updatedOrder;
    });

    await queueOrderPaidNotifications({
        order,
        member: previousOrder.member,
        location: previousOrder.location,
    });
}
