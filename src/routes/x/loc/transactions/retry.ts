import { db } from "@/db/db";
import { paymentQueue } from "@/queues/payments";
import type Elysia from "elysia";
import { and, eq } from "drizzle-orm";
import {
    RETRYABLE_SUBSCRIPTION_STATUSES,
    getString,
    resolveGatewayPaymentId,
    resolveGatewayService,
} from "../subscriptions/shared";

export async function retryTransactionRoutes(app: Elysia) {
    return app.post("/:tid/retry", async ({ params, status }) => {
        const { lid, tid } = params as { lid: string; tid: string };

        const tx = await db.query.transactions.findFirst({
            where: (t, { and, eq }) => and(eq(t.id, tid), eq(t.locationId, lid)),
            columns: { id: true, type: true, status: true, paymentIntentId: true, metadata: true },
        });

        if (!tx) {
            return status(404, { error: "Transaction not found", code: "TRANSACTION_NOT_FOUND" });
        }

        if (tx.type !== "inbound" || tx.status !== "failed") {
            return status(400, {
                error: "Only failed inbound transactions can be retried",
                code: "TRANSACTION_NOT_RETRYABLE",
            });
        }

        const subId = getString(tx.metadata.memberSubscriptionId)
            || getString(tx.metadata.subscriptionId);

        if (!subId) {
            return status(400, {
                error: "Package payment retry is not yet supported",
                code: "PACKAGE_RETRY_NOT_SUPPORTED",
            });
        }

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, subId), eq(s.locationId, lid)),
            columns: { id: true, status: true, cancelAt: true },
        });

        if (!sub) {
            return status(404, { error: "Linked subscription not found", code: "SUBSCRIPTION_NOT_FOUND" });
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

        const paymentIntentId = resolveGatewayPaymentId({
            paymentIntentId: tx.paymentIntentId,
            metadata: tx.metadata,
        });

        if (!paymentIntentId) {
            return status(400, {
                error: "No gateway payment id found for this transaction",
                code: "GATEWAY_PAYMENT_ID_MISSING",
            });
        }

        const jobId = `manual-retry-${tx.id}`;
        const job = await paymentQueue.add("retry:sub", {
            paymentIntentId,
            attempts: 0,
            subId: sub.id,
            lid,
        }, { jobId });

        return status(200, {
            enqueued: true,
            jobId: job.id || jobId,
            transactionId: tx.id,
            gatewayService: resolveGatewayService(tx.metadata),
        });
    });
}
