import { getDeferredInvoiceBilling, prepareSquareInvoiceAttempt } from "@/utils/invoiceAttempts";
import { strict as assert } from "node:assert";
import { memberInvoices, memberSubscriptions, transactions } from "@/subtrees/schemas";
import { db } from "@/db/db";
import { dispatchPaymentFailed } from "@/subtrees/utils/server/workflows";
import { isPaymentDecline } from "@/subtrees/utils/workflow/payments";
import { and, eq, notInArray } from "drizzle-orm";
import type { PaymentType } from "@/subtrees/types";
import type { Currency } from "@/subtrees/types/currency";


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
        const [priorInvoice] = await tx.select().from(memberInvoices).where(eq(memberInvoices.id, invoiceId)).for("update");
        assert(priorInvoice, "Invoice not found");
        const deferred = await getDeferredInvoiceBilling(tx, priorInvoice.memberPlanId);
        // TODO(billing): review stale callbacks and subscription status guards for ordinary payments separately.
        // Only deferred subscriptions use the new attempt checks and status guards in this PR.
        const attemptResult = prepareSquareInvoiceAttempt(deferred ? priorInvoice : { ...priorInvoice, metadata: null }, amount, squarePaymentId, "failed");
        if (!attemptResult) return;
        const { paymentMethodId: attemptedMethodId, ...attemptUpdate } = attemptResult;
        const [invoice] = await tx.update(memberInvoices).set({
            status: "unpaid",
            paid: false,
            ...attemptUpdate,
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
            status: "failed" as const,
            paymentMethodId: paymentMethodId ?? attemptedMethodId ?? null,
            paymentType,
            chargeDate: now,
            feeAmount,
            failedReason,
            failedCode,
            metadata: {
                ...attemptUpdate.metadata,
                gatewayService: "square" as const,
                squarePaymentId,
                squarePaymentStatus,
                memberPlanId: invoice.memberPlanId,
            },
            updated: now,
        };

        if (invoice.transactionId) {
            const previous = await tx.query.transactions.findFirst({
                where: eq(transactions.id, invoice.transactionId),
                columns: { status: true, failedReason: true, failedCode: true },
            });
            await tx.update(transactions).set(values).where(eq(transactions.id, invoice.transactionId));
            if (isPaymentDecline("square", failedCode, squarePaymentStatus)
                && (previous?.status === "pending" || (previous?.status === "failed" && !previous.failedCode && !previous.failedReason))) {
                await dispatchPaymentFailed(tx, invoice.transactionId);
            }
        } else {
            const [transaction] = await tx.insert(transactions).values(values).returning({ id: transactions.id });
            assert(transaction);
            await tx.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoiceId));
            if (isPaymentDecline("square", failedCode, squarePaymentStatus)) await dispatchPaymentFailed(tx, transaction.id);
        }

        if (invoice.memberPlanId?.startsWith("pkg_") === false) {
            await tx.update(memberSubscriptions).set({
                gatewayPaymentId: paymentMethodId,
                status: "past_due",
            }).where(and(eq(memberSubscriptions.id, invoice.memberPlanId), deferred ? notInArray(memberSubscriptions.status, ["canceled", "paused", "incomplete_expired"]) : undefined));
        }
    });

    console.log("[SQUARE WEBHOOK] Payment failed for invoice", invoiceId);
}
