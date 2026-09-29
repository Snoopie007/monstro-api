import { db } from "@/db/db";
import { getStripeMigration } from "@/subtrees/utils/subscriptionBilling";
import { scheduleRenewalRepair } from "@/queues/subscriptions";
import { paymentQueue } from "@/queues/payments";
import { RetrySubPaymentSchema } from "@/subtrees/bullmq";
import { memberInvoices, memberSubscriptions, transactions } from "@/subtrees/schemas";
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
                const importedStripeRoot = Boolean(getStripeMigration(sub.metadata));
                if (importedStripeRoot) await scheduleRenewalRepair(sid, lid, paidInvoice.forPeriodEnd);
                await db.update(memberSubscriptions).set({ status: "active", updated: new Date() }).where(and(
                    eq(memberSubscriptions.id, sid),
                    eq(memberSubscriptions.status, "past_due"),
                ));
                return status(200, { enqueued: importedStripeRoot, repairOnly: true, invoiceId: paidInvoice.id });
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
        const job = await paymentQueue.add("retry:sub", data, { jobId });

        return status(200, {
            enqueued: true,
            jobId: job.id || jobId,
            transactionId: failedTransaction.id,
            gatewayService: resolveGatewayService(metadata),
        });
    });
}
