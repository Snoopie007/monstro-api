import { scheduleRenewalRepair } from "@/queues/subscriptions";
import { getDeferredInvoiceBilling, prepareSquareInvoiceAttempt } from "@/utils/invoiceAttempts";
import { strict as assert } from "node:assert";
import { memberInvoices, memberSubscriptions, memberPackages, transactions } from "@/subtrees/schemas";
import { db } from "@/db/db";
import { and, eq, isNull, ne, notInArray, or } from "drizzle-orm";
import { isBundleRefundPaymentReplay, preserveBundleRefundProgress } from "@/routes/x/loc/addonsBundles/bundleRefundState";
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

    let repair: { sid: string; lid: string; dueAt: Date | null } | undefined;
    await db.transaction(async (tx) => {
        const [priorInvoice] = await tx.select().from(memberInvoices).where(eq(memberInvoices.id, invoiceId)).for("update");
        assert(priorInvoice, "Invoice not found");
        const subscription = priorInvoice.memberPlanId ? await tx.query.memberSubscriptions.findFirst({
            where: eq(memberSubscriptions.id, priorInvoice.memberPlanId),
            columns: { bundlePurchaseId: true },
        }) : undefined;
        const bundled = Boolean(subscription?.bundlePurchaseId);

        if (bundled && amount !== priorInvoice.total) throw new Error("Square bundle subscription charge amount does not match its invoice");

        if (bundled && priorInvoice.transactionId) {
            const previous = await tx.query.transactions.findFirst({
                where: eq(transactions.id, priorInvoice.transactionId),
                columns: { status: true, paymentIntentId: true, metadata: true },
            });

            if (previous && isBundleRefundPaymentReplay(previous.metadata, squarePaymentId ?? null)) return;
        }

        const deferred = await getDeferredInvoiceBilling(tx, priorInvoice.memberPlanId);
        // TODO(billing): review stale callbacks and subscription status guards for ordinary payments separately.
        // Only deferred subscriptions use the new attempt checks and status guards in this PR.
        const attemptResult = prepareSquareInvoiceAttempt(deferred ? priorInvoice : { ...priorInvoice, metadata: null }, amount, squarePaymentId, "succeeded");
        if (deferred && priorInvoice.paid && priorInvoice.memberPlanId && amount === priorInvoice.total) {
            repair = { sid: priorInvoice.memberPlanId, lid: priorInvoice.locationId, dueAt: priorInvoice.forPeriodEnd };
        }
        if (!attemptResult) return;
        if (deferred && priorInvoice.memberPlanId) repair = { sid: priorInvoice.memberPlanId, lid: priorInvoice.locationId, dueAt: priorInvoice.forPeriodEnd };
        const { paymentMethodId: attemptedMethodId, ...attemptUpdate } = attemptResult;
        const [invoice] = await tx.update(memberInvoices).set({
            status: "paid",
            paid: true,
            receiptUrl,
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
            status: "paid" as const,
            paymentMethodId: paymentMethodId ?? attemptedMethodId ?? null,
            paymentType,
            paymentIntentId: bundled ? squarePaymentId : undefined,
            chargeDate: now,
            feeAmount,
            metadata: {
                ...attemptUpdate.metadata,
                gatewayService: "square",
                squarePaymentId,
                squarePaymentStatus,
                memberPlanId: invoice.memberPlanId,
            },
            updated: now,
        };

        if (invoice.transactionId) {
            await tx.update(transactions).set({
                ...values,
                metadata: preserveBundleRefundProgress(values.metadata),
            }).where(eq(transactions.id, invoice.transactionId));
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
            }).where(and(
                eq(memberSubscriptions.id, invoice.memberPlanId),
                deferred ? notInArray(memberSubscriptions.status, ["canceled", "paused", "incomplete_expired"]) : undefined,
                or(isNull(memberSubscriptions.bundlePurchaseId), ne(memberSubscriptions.status, "canceled")),
            ));
        }
    });

    if (repair) await scheduleRenewalRepair(repair.sid, repair.lid, repair.dueAt);

    console.log("[SQUARE WEBHOOK] Payment completed for invoice", invoiceId);
}
