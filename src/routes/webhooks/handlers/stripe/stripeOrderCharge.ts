import { db } from "@/db/db";
import type { PaymentType } from "@subtrees/types";
import { orders, transactions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

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
    stripeChargeId, }:
    HandleStripeOrderChargeProps
) {
    const now = new Date();

    const [order] = await db.update(orders).set({
        status: success ? "paid" : "unpaid",
        updated: now,
    }).where(eq(orders.id, orderId)).returning();

    if (!order) {
        throw new Error("Order not found");
    }

    await db.insert(transactions).values({
        orderId: order.id,
        locationId,
        memberId,
        paymentMethodId,
        paymentIntentId,
        paymentType,
        feeAmount,
        total: amount,
        type: "inbound" as const,
        status: success ? "paid" as const : "failed" as const,
        failedReason: failedReason,
        failedCode: failedCode,
        metadata: {
            gatewayService: "stripe",
            stripeChargeId,
        },
    });
    ;
}

