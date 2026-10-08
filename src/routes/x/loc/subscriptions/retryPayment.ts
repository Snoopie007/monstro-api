import { getDeferredBilling } from "@/subtrees/utils/deferredBilling";
import { db } from "@/db/db";
import { getStripeMigration } from "@/subtrees/utils/subscriptionBilling";
import { scheduleRenewalRepair } from "@/queues/subscriptions";
import { paymentQueue } from "@/queues/payments";
import { RetrySubPaymentSchema } from "@/subtrees/bullmq";
import { memberInvoices, memberSubscriptions, transactions } from "@/subtrees/schemas";
import type { SubscriptionRetryExecution, SubscriptionRetryReceipt } from "@/subtrees/types";
import type Elysia from "elysia";
import { and, desc, eq, or } from "drizzle-orm";
import { findInFlightSubscriptionAttempt } from "./billingContext";
import { resolveGatewayPaymentId, resolveGatewayService } from "./shared";

export async function retrySubscriptionPaymentRoutes(app: Elysia) {
    return app.post("/:sid/payment/retry", async ({ params, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            columns: { id: true, memberId: true, status: true, cancelAt: true, parentId: true, currentPeriodEnd: true, metadata: true },
        });

        if (!sub) {
            return status(404, { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" });
        }
        if (sub.parentId) {
            return status(400, {
                error: "Only root subscriptions can be retried",
                code: "SUBSCRIPTION_CHILD",
            });
        }
        const inFlight = await findInFlightSubscriptionAttempt(sub.id);
        if (inFlight) {
            return status(409, {
                enqueued: false,
                error: "A payment attempt is still in flight; retry will not create another charge",
                code: "PAYMENT_ATTEMPT_IN_FLIGHT",
                invoiceId: inFlight.invoice?.id,
                attemptStatus: inFlight.status,
                execution: inFlight.invoice?.metadata?.retryExecution,
            });
        }

        if (sub.cancelAt && sub.cancelAt.getTime() <= Date.now()) {
            return status(400, {
                error: "Canceled subscriptions cannot be retried",
                code: "SUBSCRIPTION_CANCELED",
            });
        }

        const [failedTransaction] = await db
            .select({
                id: transactions.id,
                invoiceId: memberInvoices.id,
                paymentIntentId: transactions.paymentIntentId,
                metadata: transactions.metadata,
                invoiceMetadata: memberInvoices.metadata,
            })
            .from(transactions)
            .leftJoin(memberInvoices, eq(memberInvoices.transactionId, transactions.id))
            .where(and(
                eq(transactions.locationId, lid),
                eq(memberInvoices.locationId, lid),
                eq(memberInvoices.memberPlanId, sid),
                eq(transactions.status, "failed"),
                eq(transactions.type, "inbound"),
                eq(memberInvoices.status, "unpaid"),
            ))
            .orderBy(desc(transactions.chargeDate), desc(transactions.created))
            .limit(1);

        if (!failedTransaction) {
            const paidInvoice = sub.currentPeriodEnd && await db.query.memberInvoices.findFirst({
                where: (invoice, { and, eq }) => and(
                    eq(invoice.locationId, lid),
                    eq(invoice.memberId, sub.memberId),
                    eq(invoice.memberPlanId, sid),
                    eq(invoice.forPeriodEnd, sub.currentPeriodEnd!),
                    or(eq(invoice.status, "paid"), eq(invoice.paid, true)),
                ),
                columns: { id: true, forPeriodEnd: true },
            });
            if (paidInvoice) {
                const repairRenewal = Boolean(getStripeMigration(sub.metadata) || getDeferredBilling(sub.metadata));
                if (repairRenewal) await scheduleRenewalRepair(sid, lid, paidInvoice.forPeriodEnd);
                await db.update(memberSubscriptions).set({ status: "active", updated: new Date() }).where(and(
                    eq(memberSubscriptions.id, sid),
                    eq(memberSubscriptions.status, "past_due"),
                ));
                return status(200, { enqueued: false, repairOnly: true, invoiceId: paidInvoice.id, renewalRepairEnqueued: repairRenewal } satisfies SubscriptionRetryReceipt);
            }
            return status(400, {
                error: "No failed transaction found for this subscription",
                code: "FAILED_TRANSACTION_NOT_FOUND",
            });
        }

        if (!failedTransaction.invoiceId) {
            return status(400, {
                error: "No invoice found for this failed subscription payment",
                code: "INVOICE_NOT_FOUND",
            });
        }

        const metadata = failedTransaction.metadata;
        const paymentIntentId = resolveGatewayPaymentId({
            paymentIntentId: failedTransaction.paymentIntentId,
            metadata,
        });
        const attempt = failedTransaction.invoiceMetadata?.billingAttempt;
        const knownFailed = attempt && typeof attempt === "object" && attempt.status === "failed";

        if (!paymentIntentId && !knownFailed) {
            return status(400, {
                error: "No gateway payment id found for latest failed transaction",
                code: "GATEWAY_PAYMENT_ID_MISSING",
            });
        }

        const jobId = `manual-retry-${failedTransaction.id}`;
        const data = RetrySubPaymentSchema.parse({
            invoiceId: failedTransaction.invoiceId,
            attempts: 0,
            subId: sid,
            lid,
        });
        try {
            const receipt = await db.transaction(async tx => {
                // A worker also takes this lock before starting and saving its result.
                // Publish the actual queue receipt before it can finish/remove the job.
                const [invoice] = await tx.select().from(memberInvoices).where(eq(memberInvoices.id, failedTransaction.invoiceId!)).for("update");
                if (!invoice) throw new Error("RETRY_INVOICE_MISSING");
                const invoiceMetadata = invoice.metadata && typeof invoice.metadata === "object" && !Array.isArray(invoice.metadata) ? invoice.metadata : {};
                const billingAttempt = invoiceMetadata.billingAttempt as { status?: string } | undefined;
                const previousExecution = invoiceMetadata.retryExecution as SubscriptionRetryExecution | undefined;
                if (invoice.paid || invoice.status === "paid" || billingAttempt && billingAttempt.status !== "failed") throw new Error("RETRY_ATTEMPT_IN_FLIGHT");
                if (previousExecution?.status === "running") throw new Error("RETRY_ATTEMPT_IN_FLIGHT");
                const added = await paymentQueue.add("retry:sub", data, { jobId });
                // Queue.add may return a freshly constructed Job for a duplicate ID.
                // Its timestamp is NOT the retained execution's timestamp.
                const queued = await paymentQueue.getJob(added.id || jobId);
                if (!queued?.id || !Number.isFinite(queued.timestamp)) throw new Error("RETRY_QUEUE_RECEIPT_MISSING");
                const execution: SubscriptionRetryExecution = {
                    invoiceId: invoice.id,
                    executionId: `${queued.id}@${queued.timestamp}`,
                    jobId: queued.id,
                    queuedAt: queued.timestamp,
                    status: "queued",
                    code: "RETRY_QUEUED",
                    message: "Retry queued. Payment has not been confirmed.",
                };
                if (previousExecution && previousExecution.executionId !== execution.executionId && (
                    previousExecution.queuedAt > execution.queuedAt
                    || previousExecution.queuedAt === execution.queuedAt && previousExecution.executionId > execution.executionId
                )) throw new Error("RETRY_ATTEMPT_IN_FLIGHT");
                const latest = previousExecution?.executionId === execution.executionId ? previousExecution : execution;
                await tx.update(memberInvoices).set({ metadata: { ...invoiceMetadata, retryExecution: latest }, updated: new Date() }).where(eq(memberInvoices.id, invoice.id));
                return {
                    enqueued: true,
                    jobId: queued.id,
                    invoiceId: invoice.id,
                    execution: latest,
                    transactionId: failedTransaction.id,
                    gatewayService: resolveGatewayService(metadata),
                } satisfies SubscriptionRetryReceipt;
            });
            return status(200, receipt);
        } catch (error) {
            if (error instanceof Error && error.message === "RETRY_ATTEMPT_IN_FLIGHT") {
                return status(409, { enqueued: false, error: "Another payment attempt is queued or in flight. Refresh billing before retrying.", code: "PAYMENT_ATTEMPT_IN_FLIGHT", invoiceId: failedTransaction.invoiceId });
            }
            console.error("Failed to enqueue subscription payment retry", error);
            return status(503, { enqueued: false, error: "The retry could not be queued. Refresh billing to check its status before trying again.", code: "RETRY_ENQUEUE_FAILED", invoiceId: failedTransaction.invoiceId });
        }
    });
}
