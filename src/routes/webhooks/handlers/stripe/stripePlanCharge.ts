import { strict as assert } from "node:assert";

import type { PaymentType } from "@subtrees/types";
import type { Currency } from "@subtrees/types/currency";
import { db } from "@/db/db";
import { memberInvoices, memberPackages, memberSubscriptions, transactions } from "@subtrees/schemas";
import { eq } from "drizzle-orm";


interface HandleStripePlanChargeProps {
    invoiceId: string;
    memberPlanId: string;
    locationId: string;
    memberId: string;
    paymentType: PaymentType;
    failedReason: string | null;
    failedCode: string | null;
    success: boolean;
    receiptUrl: string | null;
    amount: number;
    paymentMethodId: string | null;
    paymentIntentId: string | null;
    feeAmount: number;
    stripeChargeId?: string;
}



export async function handleStripePlanCharge({
    invoiceId,
    memberPlanId,
    locationId,
    memberId,
    amount,
    paymentType,
    failedReason,
    failedCode,
    success,
    receiptUrl,
    paymentMethodId,
    paymentIntentId,
    feeAmount,
    stripeChargeId,
}: HandleStripePlanChargeProps) {
    const now = new Date();

    await db.transaction(async (tx) => {
        const [invoice] = await tx.update(memberInvoices).set({
            status: success ? "paid" : "unpaid",
            paid: success,
            receiptUrl,
            updated: now,
        }).where(eq(memberInvoices.id, invoiceId)).returning();
        assert(invoice, "Invoice not found");

        const values = {
            description: invoice.description,
            currency: (invoice.currency || "USD") as Currency,
            total: amount,
            subTotal: invoice.subTotal,
            tax: invoice.tax,
            items: invoice.items || [],
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
                gatewayService: "stripe" as const,
                stripeChargeId,
                memberPlanId,
            },
            updated: now,
        };

        if (invoice.transactionId) {
            await tx.update(transactions).set(values).where(eq(transactions.id, invoice.transactionId));
        } else {
            const [transaction] = await tx.insert(transactions).values(values).returning({ id: transactions.id });
            assert(transaction);
            await tx.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoiceId));
        }

        if (memberPlanId.startsWith("pkg_")) {
            if (success) {
                await tx.update(memberPackages).set({ status: "active" }).where(eq(memberPackages.id, memberPlanId));
            }
            return;
        }

        const subscription = await tx.query.memberSubscriptions.findFirst({
            where: eq(memberSubscriptions.id, memberPlanId),
            columns: { status: true },
        });
        if (subscription?.status === "canceled") return;

        await tx.update(memberSubscriptions).set({
            gatewayPaymentId: paymentMethodId,
            status: success ? "active" : "past_due",
        }).where(eq(memberSubscriptions.id, memberPlanId));
    });
}
