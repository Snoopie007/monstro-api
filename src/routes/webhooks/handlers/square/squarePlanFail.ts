import { strict as assert } from "node:assert";
import { memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import type { PaymentType } from "@subtrees/types";


interface HandleSquarePlanFailProps {
    invoiceId: string;
    paymentType: PaymentType;
    paymentMethodId: string | undefined;
    feeAmount: number;
    squarePaymentId: string | undefined;
    squarePaymentStatus: string | undefined;
    amount: number;
    failedReason: string | null;
    failedCode: string | null;
}

export async function handleSquarePlanFail(props: HandleSquarePlanFailProps) {
    const {
        invoiceId,
        paymentType,
        paymentMethodId,
        feeAmount,
        squarePaymentId,
        squarePaymentStatus,
        amount,
        failedReason,
        failedCode,
    } = props;
    const now = new Date();

    await db.transaction(async (tx) => {
        const [invoice] = await tx.update(memberInvoices).set({
            status: "unpaid",
            paid: false,
            updated: now,
        }).where(eq(memberInvoices.id, invoiceId)).returning();
        assert(invoice, "Invoice not found");

        const values = {
            description: invoice.description,
            currency: invoice.currency || "USD",
            locationId: invoice.locationId,
            memberId: invoice.memberId,
            total: amount,
            subTotal: invoice.subTotal,
            tax: invoice.tax,
            type: "inbound" as const,
            status: "failed" as const,
            paymentMethodId: paymentMethodId ?? null,
            paymentType,
            chargeDate: now,
            feeAmount,
            failedReason,
            failedCode,
            metadata: {
                gatewayService: "square" as const,
                squarePaymentId,
                squarePaymentStatus,
                memberPlanId: invoice.memberPlanId,
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

        if (invoice.memberPlanId?.startsWith("pkg_") === false) {
            await tx.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethodId,
                status: "past_due",
            }).where(eq(memberSubscriptions.id, invoice.memberPlanId));
        }
    });

    console.log("[SQUARE WEBHOOK] Payment failed for invoice", invoiceId);
}