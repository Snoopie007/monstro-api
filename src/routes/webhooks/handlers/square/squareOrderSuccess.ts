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
    const now = new Date();
    // Read the pre-update status and notification relations once; the returned order below is post-update.
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


    const [order] = await db.update(orders).set({
        status: "paid",
        updated: now,
    }).where(eq(orders.id, orderId)).returning();

    if (!order) {
        throw new Error("Order not found");
    }

    await db.insert(transactions).values({
        orderId: order.id,
        locationId: order.locationId,
        memberId: order.memberId,
        paymentMethodId,
        paymentIntentId,
        paymentType,
        feeAmount,
        total: amount,
        type: "inbound" as const,
        status: "paid" as const,
        metadata: {
            gatewayService: "square",
        },
    });
    if (previousOrder && previousOrder.status !== "paid") {
        await queueOrderPaidNotifications({
            order,
            member: previousOrder.member,
            location: previousOrder.location,
        });
    }
    ;
}
