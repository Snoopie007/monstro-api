import { db } from "@/db/db";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { removeRenewalJobs } from "@/queues/subscriptions";
import { memberSubscriptions, transactions } from "@subtrees/schemas";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, desc, eq, sql } from "drizzle-orm";
import { getRefundAmounts } from "@/utils/refunds";

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
                nonRefundableAmount?: number;
            } = { executed: false };

            if (refund?.enabled) {
                const [latestPaidTransaction] = await db
                    .select({
                        id: transactions.id,
                        total: transactions.total,
                        items: transactions.items,
                        currency: transactions.currency,
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

                const transactionMetadata = latestPaidTransaction.metadata as {
                    gatewayService?: "stripe" | "square";
                    squarePaymentId?: string;
                    chargeId?: string;
                } | null;

                const locationState = await db.query.locationState.findFirst({
                    where: (state, { eq }) => eq(state.locationId, lid),
                    columns: {
                        paymentGatewayId: true,
                    },
                });

                const integration = transactionMetadata?.gatewayService
                    ? await db.query.integrations.findFirst({
                        where: (integration, { and, eq }) => and(
                            eq(integration.locationId, lid),
                            eq(integration.service, transactionMetadata.gatewayService!)
                        ),
                        columns: {
                            accountId: true,
                            accessToken: true,
                            service: true,
                        },
                    })
                    : locationState?.paymentGatewayId
                        ? await db.query.integrations.findFirst({
                            where: (integration, { eq }) => eq(integration.id, locationState.paymentGatewayId!),
                            columns: {
                                accountId: true,
                                accessToken: true,
                                service: true,
                            },
                        })
                        : null;

                const refundAmounts = await getRefundAmounts(
                    lid,
                    latestPaidTransaction.total,
                    latestPaidTransaction.items,
                );
                let requestedAmount = refundAmounts.refundableAmount;
                if (refund.amountType === "partial") {
                    if (typeof refund.amount !== "number" || refund.amount <= 0) {
                        return status(400, { error: "Valid amount is required for partial refunds" });
                    }
                    if (refund.amount > refundAmounts.refundableAmount) {
                        return status(400, {
                            error: "Refund amount cannot exceed refundable amount",
                            maximumRefundableAmount: refundAmounts.refundableAmount,
                        });
                    }
                    requestedAmount = refund.amount;
                }

                if (requestedAmount <= 0) {
                    return status(400, { error: "Refund amount must be greater than 0" });
                }

                if (!integration || !integration.accessToken) {
                    return status(404, { error: "Payment gateway integration not found" });
                }

                try {
                    if (integration.service === "stripe") {
                        if (!integration.accountId) {
                            return status(404, { error: "Stripe integration not found" });
                        }

                        const stripe = new StripePaymentGateway(integration.accessToken);
                        await stripe.createRefund(paymentIntentId, requestedAmount, latestPaidTransaction.currency);
                    } else if (integration.service === "square") {
                        const square = new SquarePaymentGateway(integration.accessToken);
                        await square.refundPayment(
                            transactionMetadata?.squarePaymentId || transactionMetadata?.chargeId || paymentIntentId,
                            requestedAmount,
                            reason || "Subscription cancellation"
                        );
                    } else {
                        return status(400, { error: "Unsupported payment gateway for subscription refunds" });
                    }
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
                    metadata: {
                        ...(latestPaidTransaction.metadata || {}),
                        refundGatewayService: integration.service,
                        refund: {
                            amount: requestedAmount,
                            nonRefundableAmount: refundAmounts.nonRefundableAmount,
                            refundedAt: new Date().toISOString(),
                        },
                    },
                    updated: new Date(),
                }).where(eq(transactions.id, latestPaidTransaction.id));

                refundResult = {
                    executed: true,
                    transactionId: latestPaidTransaction.id,
                    paymentIntentId,
                    amount: requestedAmount,
                    nonRefundableAmount: refundAmounts.nonRefundableAmount,
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
