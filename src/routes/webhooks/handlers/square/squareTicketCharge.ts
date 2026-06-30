import type { PaymentType } from "@subtrees/types";
import { db } from "@/db/db";
import { transactions, eventRegistrations } from "@subtrees/schemas";
import { eq } from "drizzle-orm";

interface HandleSquareTicketChargeProps {
    registrationId: string;
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
    squarePaymentId?: string;
    squarePaymentStatus?: string;
}

export async function handleSquareTicketCharge({
    registrationId,
    locationId,
    memberId,
    amount,
    paymentType,
    failedReason,
    failedCode,
    success,
    paymentMethodId,
    paymentIntentId,
    feeAmount,
    squarePaymentId,
    squarePaymentStatus,
}: HandleSquareTicketChargeProps) {
    const now = new Date();
    await db.transaction(async (tx) => {
        const [transaction] = await tx.insert(transactions).values({
            total: amount,
            type: "inbound" as const,
            status: success ? "paid" as const : "failed" as const,
            failedReason,
            failedCode,
            locationId,
            memberId,
            paymentMethodId,
            paymentIntentId,
            paymentType,
            chargeDate: now,
            feeAmount,
            metadata: {
                gatewayService: "square",
                squarePaymentId,
                squarePaymentStatus,
                registrationId,
            },
        }).returning({ id: transactions.id });

        if (!transaction) {
            throw new Error("Transaction not created");
        }

        await tx.update(eventRegistrations).set({
            status: success ? "registered" as const : "cancelled" as const,
            transactionId: transaction.id,
            updated: now,
        }).where(eq(eventRegistrations.id, registrationId));
    });
}
