import { db } from "@/db/db";
import { MemberStripePayments } from "@/libs/stripe";
import { removeRenewalJobs } from "@/queues/subscriptions";
import { memberSubscriptions, transactions } from "@subtrees/schemas";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, desc, eq, sql } from "drizzle-orm";

export async function cancelSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/cancel", async ({ params, body, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const { mode, cancelAt, refund, reason } = body;

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
        });
        if (!sub) {
            return status(404, { error: "Subscription not found" });
        }

        if (mode === "now") {
            let refundResult: {
                executed: boolean;
                transactionId?: string;
                paymentIntentId?: string;
                amount?: number;
            } = { executed: false };

            if (refund?.enabled) {
                const [latestPaidTransaction] = await db
                    .select({
                        id: transactions.id,
                        total: transactions.total,
                        paymentIntentId: transactions.paymentIntentId,
                        metadata: transactions.metadata,
                    })
                    .from(transactions)
                    .where(and(
                        eq(transactions.locationId, lid),
                        eq(transactions.memberId, sub.memberId),
                        eq(transactions.type, "inbound"),
                        eq(transactions.status, "paid"),
                        eq(transactions.refunded, false),
                        sql`${transactions.metadata}->>'memberSubscriptionId' = ${sid}`
                    ))
                    .orderBy(desc(transactions.chargeDate), desc(transactions.created))
                    .limit(1);

                if (!latestPaidTransaction) {
                    return status(400, { error: "No paid transaction found for this subscription" });
                }

                const paymentIntentId = latestPaidTransaction.paymentIntentId
                    || (latestPaidTransaction.metadata as { paymentIntentId?: string } | null)?.paymentIntentId;

                if (!paymentIntentId) {
                    return status(400, { error: "No payment intent found for latest transaction" });
                }

                const integration = await db.query.integrations.findFirst({
                    where: (integration, { and, eq }) => and(
                        eq(integration.locationId, lid),
                        eq(integration.service, "stripe")
                    ),
                    columns: {
                        accountId: true,
                    },
                });

                if (!integration?.accountId) {
                    return status(404, { error: "Stripe integration not found" });
                }

                const stripe = new MemberStripePayments(integration.accountId);
                const requestedAmount =
                    refund.amountType === "partial" && typeof refund.amount === "number"
                        ? Math.max(0, Math.min(refund.amount, latestPaidTransaction.total))
                        : latestPaidTransaction.total;

                if (requestedAmount <= 0) {
                    return status(400, { error: "Refund amount must be greater than 0" });
                }

                try {
                    await stripe.createRefund({
                        payment_intent: paymentIntentId,
                        amount: requestedAmount,
                    });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to process refund";
                    const code = typeof error === "object"
                        && error !== null
                        && "code" in error
                        && typeof (error as { code?: unknown }).code === "string"
                        ? (error as { code: string }).code
                        : undefined;

                    return status(409, {
                        error: message,
                        ...(code ? { code } : {}),
                    });
                }

                await db.update(transactions).set({
                    refunded: true,
                    refundedAmount: requestedAmount,
                    updated: new Date(),
                }).where(eq(transactions.id, latestPaidTransaction.id));

                refundResult = {
                    executed: true,
                    transactionId: latestPaidTransaction.id,
                    paymentIntentId,
                    amount: requestedAmount,
                };
            }

            await db.update(memberSubscriptions).set({
                status: "canceled",
                cancelAt: new Date(),
                endedAt: new Date(),
                cancelAtPeriodEnd: false,
                metadata: {
                    ...(sub.metadata || {}),
                    cancellation: {
                        reason: reason || null,
                        option: mode,
                        processedAt: new Date().toISOString(),
                        refund: refundResult,
                    },
                },
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, sid));

            await removeRenewalJobs(sid);

            return status(200, {
                status: "canceled",
                cancelAt: new Date(),
                scheduler: { cancelled: true },
                refund: refundResult,
            });
        }

        if (mode === "end_of_period") {
            await db.update(memberSubscriptions).set({
                cancelAtPeriodEnd: true,
                cancelAt: sub.currentPeriodEnd,
                metadata: {
                    ...(sub.metadata || {}),
                    cancellation: {
                        reason: reason || null,
                        option: mode,
                        processedAt: new Date().toISOString(),
                        refund: { executed: false },
                    },
                },
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, sid));

            return status(200, {
                status: "cancel_at_period_end",
                cancelAt: sub.currentPeriodEnd,
                scheduler: { cancelled: false },
                refund: { executed: false },
            });
        }

        const cancelAtDate = cancelAt ? new Date(cancelAt) : null;
        await db.update(memberSubscriptions).set({
            cancelAt: cancelAtDate,
            cancelAtPeriodEnd: false,
            metadata: {
                ...(sub.metadata || {}),
                cancellation: {
                    reason: reason || null,
                    option: mode,
                    processedAt: new Date().toISOString(),
                    refund: { executed: false },
                },
            },
            updated: new Date(),
        }).where(eq(memberSubscriptions.id, sid));

        return status(200, {
            status: "active",
            cancelAt: cancelAtDate,
            scheduler: { cancelled: false },
            refund: { executed: false },
        });
    }, {
        body: t.Object({
            mode: t.Union([t.Literal("now"), t.Literal("end_of_period"), t.Literal("at_date")]),
            cancelAt: t.Optional(t.Nullable(t.String())),
            refund: t.Optional(t.Object({
                enabled: t.Boolean(),
                amountType: t.Optional(t.Union([t.Literal("full"), t.Literal("partial")])),
                amount: t.Optional(t.Number()),
            })),
            reason: t.Optional(t.String()),
        }),
    });
}
