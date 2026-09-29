import { db } from "@/db/db";
import { getStripeMigration } from "@subtrees/utils/subscriptionBilling";
import { paymentQueue } from "@/queues/payments";
import { scheduleRenewalRepair } from "@/queues/subscriptions";
import { memberSubscriptions } from "@subtrees/schemas";
import { RetrySubPaymentSchema } from "@subtrees/bullmq";
import type Elysia from "elysia";
import { and, eq } from "drizzle-orm";
import { findInFlightSubscriptionAttempt } from "../subscriptions/billingContext";
import {
    RETRYABLE_SUBSCRIPTION_STATUSES,
    resolveGatewayPaymentId,
    resolveGatewayService,
} from "../subscriptions/shared";

export async function retryTransactionRoutes(app: Elysia) {
    return app.post("/:tid/retry", async ({ params, status }) => {
        const { lid, tid } = params as { lid: string; tid: string };

        const tx = await db.query.transactions.findFirst({
            where: (t, { and, eq }) => and(eq(t.id, tid), eq(t.locationId, lid)),
            columns: { id: true, memberId: true, type: true, status: true, paymentIntentId: true, metadata: true },
            with: { invoice: { columns: { id: true, memberId: true, locationId: true, memberPlanId: true, metadata: true, paid: true, status: true, forPeriodEnd: true } } },
        });

        if (!tx) {
            return status(404, { error: "Transaction not found", code: "TRANSACTION_NOT_FOUND" });
        }

        if (tx.type !== "inbound") {
            return status(400, {
                error: "Only failed inbound transactions can be retried",
                code: "TRANSACTION_NOT_RETRYABLE",
            });
        }

        if (!tx.invoice || tx.invoice.locationId !== lid || tx.invoice.memberId !== tx.memberId) {
            return status(tx.invoice ? 404 : 400, { error: "Invoice not found for this transaction", code: "INVOICE_NOT_FOUND" });
        }
        const { memberPlanId: subId, memberId } = tx.invoice;

        if (!subId) {
            return status(400, {
                error: "Package payment retry is not yet supported",
                code: "PACKAGE_RETRY_NOT_SUPPORTED",
            });
        }

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, subId), eq(s.locationId, lid), eq(s.memberId, memberId)),
            columns: { id: true, status: true, cancelAt: true, parentId: true, currentPeriodEnd: true, metadata: true },
        });

        if (!sub) {
            return status(404, { error: "Linked subscription not found", code: "SUBSCRIPTION_NOT_FOUND" });
        }
        if (sub.parentId) {
            return status(400, { error: "Only root subscriptions can be retried", code: "SUBSCRIPTION_CHILD" });
        }
        const inFlight = await findInFlightSubscriptionAttempt(sub.id);
        if (inFlight) {
            return status(409, {
                error: "The current payment outcome must be resolved before retrying",
                code: "PAYMENT_ATTEMPT_IN_FLIGHT",
            });
        }

        const paid = tx.invoice.paid || tx.invoice.status === "paid";
        if (!RETRYABLE_SUBSCRIPTION_STATUSES.has(sub.status) && !(paid && sub.status === "active")) {
            return status(400, {
                error: "Only past due or unpaid subscriptions can be retried",
                code: "SUBSCRIPTION_NOT_RETRYABLE",
            });
        }

        if (sub.cancelAt && sub.cancelAt.getTime() <= Date.now()) {
            return status(400, {
                error: "Canceled subscriptions cannot be retried",
                code: "SUBSCRIPTION_CANCELED",
            });
        }

        if (paid) {
            const importedStripeRoot = Boolean(getStripeMigration(sub.metadata));
            const repairDueAt = importedStripeRoot
                && tx.invoice.forPeriodEnd
                && tx.invoice.forPeriodEnd.getTime() === sub.currentPeriodEnd?.getTime()
                ? tx.invoice.forPeriodEnd
                : null;
            if (repairDueAt) {
                await scheduleRenewalRepair(sub.id, lid, repairDueAt);
                await db.update(memberSubscriptions).set({ status: "active", updated: new Date() }).where(and(
                    eq(memberSubscriptions.id, sub.id),
                    eq(memberSubscriptions.status, "past_due"),
                ));
            }
            return status(200, { enqueued: Boolean(repairDueAt), repairOnly: true, transactionId: tx.id });
        }
        if (tx.status !== "failed") {
            return status(400, { error: "Only failed inbound transactions can be retried", code: "TRANSACTION_NOT_RETRYABLE" });
        }

        const paymentIntentId = resolveGatewayPaymentId({
            paymentIntentId: tx.paymentIntentId,
            metadata: tx.metadata,
        });
        const attempt = tx.invoice.metadata?.billingAttempt;
        const knownFailed = attempt && typeof attempt === "object" && attempt.status === "failed";

        if (!paymentIntentId && !knownFailed) {
            return status(400, {
                error: "No gateway payment id found for this transaction",
                code: "GATEWAY_PAYMENT_ID_MISSING",
            });
        }

        const jobId = `manual-retry-${tx.id}`;
        const data = RetrySubPaymentSchema.parse({
            invoiceId: tx.invoice.id,
            attempts: 0,
            subId: sub.id,
            lid,
        });
        const job = await paymentQueue.add("retry:sub", data, { jobId });

        return status(200, {
            enqueued: true,
            jobId: job.id || jobId,
            transactionId: tx.id,
            gatewayService: resolveGatewayService(tx.metadata),
        });
    });
}
