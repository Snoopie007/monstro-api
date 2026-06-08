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
    const now = new Date();

    const [order] = await db.update(orders).set({
        status: "unpaid",
        updated: now,
    }).where(eq(orders.id, orderId)).returning();

    if (!order) {
        throw new Error("Order not found");
    }

    await db.insert(transactions).values({
        orderId: order.id,
        paymentMethodId,
        paymentIntentId,
        locationId: order.locationId,
        memberId: order.memberId,
        paymentType,
        feeAmount,
        total: amount,
        type: "inbound" as const,
        status: "failed" as const,
        failedReason: failedReason,
        failedCode: failedCode,
        metadata: {
            gatewayService: "stripe",
            stripeChargeId,
        },
    });
    ;
}