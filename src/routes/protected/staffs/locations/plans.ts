import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { getCheckoutContext } from "src/utils/getCheckoutContext";
import { chargeWithGateway, type ChargeWithGatewayResult } from "src/utils/checkoutUtil";
import type { TransactionActivity } from "subtrees/types";
import { memberInvoices, memberSubscriptions, transactions } from "subtrees/schemas";
import { eq } from "node_modules/drizzle-orm";

export const slMemberPlanRoutes = new Elysia({ prefix: "/plans" })

    .post("/:memberPlanId/retry", async ({ params, status }) => {
        const { lid, memberPlanId } = params;
        try {

            const sub = await db.query.memberSubscriptions.findFirst({
                where: (s, { and, eq }) => and(
                    eq(s.locationId, lid),
                    eq(s.id, memberPlanId),
                ),
            });
            if (!sub) {
                return status(404, { error: "Subscription not found" });
            }

            if (!sub.gatewayPaymentId) {
                return status(400, { error: "Subscription has no gateway payment method" });
            }

            const invoice = await db.query.memberInvoices.findFirst({
                where: (i, { and, eq }) => and(
                    eq(i.memberPlanId, sub.id),
                    eq(i.forPeriodStart, sub.currentPeriodStart),
                    eq(i.status, "unpaid"),
                ),
                with: {
                    transaction: true,
                },
            });
            if (!invoice) {
                return status(404, { error: "Failed invoice not found" });
            }

            const transaction = invoice.transaction;

            if (!transaction) {
                return status(404, { error: "Transaction not found" });
            }

            const checkoutContext = await getCheckoutContext({ lid, mid: sub.memberId });
            const { gateway, gatewayCustomerId, locationState } = checkoutContext;

            if (locationState.status !== "active") {
                return status(400, { error: "Location is not active" });
            }


            const charge: ChargeWithGatewayResult = await chargeWithGateway({
                gateway,
                gatewayCustomerId,
                paymentMethodId: sub.gatewayPaymentId,
                transactionId: transaction.id,
                paymentType: transaction.paymentType,
                total: invoice.total,
                feesAmount: transaction.feeAmount,
                currency: locationState.currency,
                description: `Retry payment for ${invoice.id}`,
                note: `transId:${transaction.id}|mid:${sub.memberId}|lid:${lid}|priceId:${sub.id}`,
                metadata: { locationId: lid, memberId: sub.memberId },
            });


            const now = new Date();
            let transactionActivity: TransactionActivity | null = null;
            switch (charge.status) {
                case "approved": {
                    transactionActivity = {
                        at: now.toISOString(),
                        reason: `Payment ${charge.status}`,
                        paymentType: transaction.paymentType,
                        brand: charge.brand,
                        last4: charge.last4,
                    }
                    break;
                }
                case "failed": {
                    transactionActivity = {
                        at: now.toISOString(),
                        reason: `Payment failed: ${charge.failureReason}`,
                        paymentType: transaction.paymentType,
                        brand: charge.brand,
                        last4: charge.last4,
                    }
                    throw new Error(`Retry payment failed: ${charge.failureReason}`);
                }
                case "uncertain":
                default: {

                    throw new Error(`Unknown payment result: ${charge.status}`);
                }
            }

            const isSuccess = charge.status === "approved";
            await db.transaction(async (tx) => {

                await tx.update(transactions).set({
                    activities: [...(transaction.activities ?? []), transactionActivity],
                }).where(eq(transactions.id, transaction.id));
                if (isSuccess) {
                    await tx.update(memberInvoices).set({
                        status: "paid",
                    }).where(eq(memberInvoices.id, invoice.id));
                    await tx.update(memberSubscriptions).set({
                        status: "active",
                    }).where(eq(memberSubscriptions.id, sub.id));
                }
            });
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
            staffId: t.String(),
            memberPlanId: t.String(),
        }),
    });
