import { strict as assert } from "node:assert";
import { memberInvoices, memberSubscriptions, memberPackages, transactions } from "@/subtrees/schemas";
import { db } from "@/db/db";
import { and, eq, notInArray } from "drizzle-orm";
import type { PaymentType } from "@/subtrees/types";
import type { Currency } from "@/subtrees/types/currency";


interface HandleSquarePlanSuccessProps {
    invoiceId: string;
    paymentType: PaymentType;
    paymentMethodId: string | undefined;
    feeAmount: number;
    squarePaymentId: string | undefined;
    squarePaymentStatus: string | undefined;
    amount: number;
    receiptUrl: string | null;
}

export async function handleSquarePlanSuccess(props: HandleSquarePlanSuccessProps) {
    const {
        invoiceId,
        paymentType,
        paymentMethodId,
        feeAmount,
        squarePaymentId,
        squarePaymentStatus,
        amount,
        receiptUrl,
    } = props;
    const now = new Date();

    await db.transaction(async (tx) => {
        const [priorInvoice] = await tx.select().from(memberInvoices).where(eq(memberInvoices.id, invoiceId)).for("update");
        assert(priorInvoice, "Invoice not found");
        const priorMetadata = priorInvoice.metadata as Record<string, unknown> | null;
        const attempt = priorMetadata?.billingAttempt as { id?: string; status?: string; paymentIntentId?: string; paymentMethodId?: string } | undefined;
        if (attempt && (priorInvoice.paid || attempt.status === "succeeded" || (attempt.paymentIntentId && attempt.paymentIntentId !== squarePaymentId))) return;
        if (attempt && amount !== priorInvoice.total) throw new Error("Square payment amount does not match invoice");
        const [invoice] = await tx.update(memberInvoices).set({
            status: "paid",
            paid: true,
            receiptUrl,
            ...(attempt ? { metadata: { ...priorMetadata, billingAttempt: { ...attempt, status: "succeeded", paymentIntentId: squarePaymentId } } } : {}),
            updated: now,
        }).where(eq(memberInvoices.id, invoiceId)).returning();
        assert(invoice, "Invoice not found");

        const values = {
            description: invoice.description,
            currency: (invoice.currency || "USD") as Currency,
            locationId: invoice.locationId,
            memberId: invoice.memberId,
            total: amount,
            subTotal: invoice.subTotal,
            tax: invoice.tax,
            items: invoice.items || [],
            type: "inbound" as const,
            status: "paid" as const,
            paymentMethodId: paymentMethodId ?? attempt?.paymentMethodId ?? null,
            paymentType,
            chargeDate: now,
            feeAmount,
            metadata: {
                ...(attempt ? { ...priorMetadata, billingAttempt: { ...attempt, status: "succeeded", paymentIntentId: squarePaymentId } } : {}),
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

        if (invoice.memberPlanId?.startsWith("pkg_")) {
            await tx.update(memberPackages).set({
                status: "active",
            }).where(eq(memberPackages.id, invoice.memberPlanId));
        } else if (invoice.memberPlanId) {
            await tx.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethodId,
                status: "active",
            }).where(and(eq(memberSubscriptions.id, invoice.memberPlanId), notInArray(memberSubscriptions.status, ["canceled", "paused", "archived", "incomplete_expired"])));
        }
    });

    console.log("[SQUARE WEBHOOK] Payment completed for invoice", invoiceId);
}
