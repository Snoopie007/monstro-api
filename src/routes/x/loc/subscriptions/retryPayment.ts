import { db } from "@/db/db";
import { paymentQueue } from "@/queues/payments";
import { transactions } from "@subtrees/schemas";
import type Elysia from "elysia";
import { and, desc, eq, sql } from "drizzle-orm";
import { RETRYABLE_SUBSCRIPTION_STATUSES, resolveGatewayPaymentId, resolveGatewayService } from "./shared";

export async function retrySubscriptionPaymentRoutes(app: Elysia) {
    return app.post("/:sid/payment/retry", async ({ params, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            columns: { id: true, status: true, cancelAt: true },
        });

        if (!sub) {
            return status(404, { error: "Subscription not found", code: "SUBSCRIPTION_NOT_FOUND" });
        }

        if (!RETRYABLE_SUBSCRIPTION_STATUSES.has(sub.status)) {
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

        const [failedTransaction] = await db
            .select({
                id: transactions.id,
                paymentIntentId: transactions.paymentIntentId,
                metadata: transactions.metadata,
            })
            .from(transactions)
            .where(and(
                eq(transactions.locationId, lid),
                eq(transactions.status, "failed"),
                eq(transactions.type, "inbound"),
                sql`(${transactions.metadata}->>'memberSubscriptionId' = ${sid} OR ${transactions.metadata}->>'subscriptionId' = ${sid})`,
            ))
            .orderBy(desc(transactions.chargeDate), desc(transactions.created))
            .limit(1);

        if (!failedTransaction) {
            return status(400, {
                error: "No failed transaction found for this subscription",
                code: "FAILED_TRANSACTION_NOT_FOUND",
            });
        }

        const metadata = failedTransaction.metadata;
        const paymentIntentId = resolveGatewayPaymentId({
            paymentIntentId: failedTransaction.paymentIntentId,
            metadata,
        });

        if (!paymentIntentId) {
            return status(400, {
                error: "No gateway payment id found for latest failed transaction",
                code: "GATEWAY_PAYMENT_ID_MISSING",
            });
        }

        const jobId = `manual-retry-${failedTransaction.id}`;
        const job = await paymentQueue.add("retry:sub", {
            paymentIntentId,
            attempts: 0,
            subId: sid,
            lid,
        }, { jobId });

        return status(200, {
            enqueued: true,
            jobId: job.id || jobId,
            transactionId: failedTransaction.id,
            gatewayService: resolveGatewayService(metadata),
        });
    });
}
