import { Elysia, t } from "elysia";
import { and, eq, gte } from "drizzle-orm";
import { db } from "@/db/db";
import {
    memberInvoices,
    memberPackages,
    reservations,
    transactions,
} from "@subtrees/schemas";
import { MemberStripePayments } from "@/libs/stripe";

export const xTransactions = new Elysia({ prefix: "/transactions" })
    .post("/:tid/refund", async ({ params, body, status }) => {
        const { lid, tid } = params as { lid: string; tid: string };
        const { amountType, amount, reason, note } = body;

        const transaction = await db.query.transactions.findFirst({
            where: (tx, { and, eq }) => and(eq(tx.id, tid), eq(tx.locationId, lid)),
            with: {
                invoice: {
                    columns: {
                        id: true,
                        memberSubscriptionId: true,
                    },
                },
            },
        });

        if (!transaction) {
            return status(404, { error: "Transaction not found" });
        }

        if (transaction.refunded) {
            return status(400, { error: "Transaction already refunded" });
        }

        if (transaction.type !== "inbound" || transaction.status !== "paid") {
            return status(400, { error: "Only paid inbound transactions can be refunded" });
        }

        const txMeta = (transaction.metadata as Record<string, unknown> | null) || {};
        const subscriptionFromMeta =
            (typeof txMeta.memberSubscriptionId === "string" && txMeta.memberSubscriptionId)
            || (typeof txMeta.subscriptionId === "string" && txMeta.subscriptionId)
            || null;
        const subscriptionFromInvoice = transaction.invoice?.memberSubscriptionId || null;

        if (subscriptionFromMeta || subscriptionFromInvoice) {
            return status(409, {
                error: "Please cancel the subscription instead to refund",
                code: "SUBSCRIPTION_REFUND_BLOCKED",
            });
        }

        const packageId =
            (typeof txMeta.memberPackageId === "string" && txMeta.memberPackageId)
            || (typeof txMeta.packageId === "string" && txMeta.packageId)
            || null;

        if (transaction.paymentType === "cash") {
            return status(400, { error: "Cash transactions cannot be refunded through Stripe" });
        }

        const integration = await db.query.integrations.findFirst({
            where: (ig, { and, eq }) => and(eq(ig.locationId, lid), eq(ig.service, "stripe")),
            columns: { accountId: true },
        });

        if (!integration?.accountId) {
            return status(404, { error: "Stripe integration not found" });
        }

        const paymentIntentId =
            transaction.paymentIntentId
            || (typeof txMeta.paymentIntentId === "string" ? txMeta.paymentIntentId : undefined);

        if (!paymentIntentId) {
            return status(400, { error: "No payment intent found for transaction" });
        }

        let refundAmount = transaction.total;
        if (amountType === "partial") {
            if (typeof amount !== "number" || amount <= 0) {
                return status(400, { error: "Valid amount is required for partial refunds" });
            }
            refundAmount = Math.min(amount, transaction.total);
        }

        const stripe = new MemberStripePayments(integration.accountId);
        const refund = await stripe.createRefund({
            payment_intent: paymentIntentId,
            amount: refundAmount,
        });

        await db.transaction(async (tx) => {
            await tx.update(transactions).set({
                refunded: true,
                refundedAmount: refundAmount,
                updated: new Date(),
                metadata: {
                    ...txMeta,
                    refund: {
                        id: refund.id,
                        amount: refundAmount,
                        reason: reason || null,
                        note: note || null,
                        refundedAt: new Date().toISOString(),
                    },
                },
            }).where(eq(transactions.id, tid));

            if (transaction.invoiceId) {
                const invoice = await tx.query.memberInvoices.findFirst({
                    where: (inv, { eq }) => eq(inv.id, transaction.invoiceId!),
                });

                if (invoice) {
                    await tx.update(memberInvoices).set({
                        ...(amountType === "full" ? { status: "void", paid: false } : {}),
                        updated: new Date(),
                        metadata: {
                            ...(invoice.metadata || {}),
                            refund: {
                                id: refund.id,
                                amount: refundAmount,
                                reason: reason || null,
                                note: note || null,
                                refundedAt: new Date().toISOString(),
                                transactionId: tid,
                            },
                        },
                    }).where(eq(memberInvoices.id, transaction.invoiceId!));
                }
            }

            if (packageId) {
                const memberPackage = await tx.query.memberPackages.findFirst({
                    where: (pkg, { and, eq }) => and(eq(pkg.id, packageId), eq(pkg.locationId, lid)),
                });

                if (memberPackage) {
                    await tx.update(memberPackages).set({
                        ...(amountType === "full" ? { status: "incomplete" } : {}),
                        updated: new Date(),
                        metadata: {
                            ...(memberPackage.metadata || {}),
                            refund: {
                                id: refund.id,
                                amount: refundAmount,
                                reason: reason || null,
                                note: note || null,
                                refundedAt: new Date().toISOString(),
                                transactionId: tid,
                            },
                        },
                    }).where(eq(memberPackages.id, packageId));

                    if (amountType === "full") {
                        const now = new Date();
                        await tx.update(reservations).set({
                            status: "cancelled_by_vendor",
                            cancelledAt: now,
                            cancelledReason: "Cancelled due to package refund",
                            updated: now,
                        }).where(and(
                            eq(reservations.memberPackageId, packageId),
                            eq(reservations.locationId, lid),
                            gte(reservations.startOn, now),
                            eq(reservations.status, "confirmed")
                        ));
                    }
                }
            }
        });

        return status(200, {
            success: true,
            refunded: true,
            transactionId: tid,
            refundId: refund.id,
            amount: refundAmount,
            message: "Refund processed successfully",
        });
    }, {
        body: t.Object({
            amountType: t.Union([t.Literal("full"), t.Literal("partial")]),
            amount: t.Optional(t.Number()),
            reason: t.Optional(t.String()),
            note: t.Optional(t.String()),
        }),
    })
    .post("/:tid/refund/cash", async ({ params, body, status }) => {
        const { lid, tid } = params as { lid: string; tid: string };
        const { amountType, amount, reason, note } = body;

        const transaction = await db.query.transactions.findFirst({
            where: (tx, { and, eq }) => and(eq(tx.id, tid), eq(tx.locationId, lid)),
            with: {
                invoice: {
                    columns: {
                        id: true,
                        memberSubscriptionId: true,
                    },
                },
            },
        });

        if (!transaction) {
            return status(404, { error: "Transaction not found" });
        }

        if (transaction.refunded) {
            return status(400, { error: "Transaction already refunded" });
        }

        if (transaction.type !== "inbound" || transaction.status !== "paid") {
            return status(400, { error: "Only paid inbound transactions can be refunded" });
        }

        if (transaction.paymentType !== "cash") {
            return status(400, { error: "Use /refund for non-cash transactions" });
        }

        const txMeta = (transaction.metadata as Record<string, unknown> | null) || {};
        const subscriptionFromMeta =
            (typeof txMeta.memberSubscriptionId === "string" && txMeta.memberSubscriptionId)
            || (typeof txMeta.subscriptionId === "string" && txMeta.subscriptionId)
            || null;
        const subscriptionFromInvoice = transaction.invoice?.memberSubscriptionId || null;

        if (subscriptionFromMeta || subscriptionFromInvoice) {
            return status(409, {
                error: "Please cancel the subscription instead to refund",
                code: "SUBSCRIPTION_REFUND_BLOCKED",
            });
        }

        const packageId =
            (typeof txMeta.memberPackageId === "string" && txMeta.memberPackageId)
            || (typeof txMeta.packageId === "string" && txMeta.packageId)
            || null;

        let refundAmount = transaction.total;
        if (amountType === "partial") {
            if (typeof amount !== "number" || amount <= 0) {
                return status(400, { error: "Valid amount is required for partial refunds" });
            }
            refundAmount = Math.min(amount, transaction.total);
        }

        const manualRefundId = `cash_manual_${Date.now()}`;

        await db.transaction(async (tx) => {
            await tx.update(transactions).set({
                refunded: true,
                refundedAmount: refundAmount,
                updated: new Date(),
                metadata: {
                    ...txMeta,
                    refund: {
                        id: manualRefundId,
                        amount: refundAmount,
                        reason: reason || null,
                        note: note || null,
                        source: "cash_manual",
                        initiatedBy: "vendor initiated",
                        refundedAt: new Date().toISOString(),
                    },
                },
            }).where(eq(transactions.id, tid));

            if (transaction.invoiceId) {
                const invoice = await tx.query.memberInvoices.findFirst({
                    where: (inv, { eq }) => eq(inv.id, transaction.invoiceId!),
                });

                if (invoice) {
                    await tx.update(memberInvoices).set({
                        ...(amountType === "full" ? { status: "void", paid: false } : {}),
                        updated: new Date(),
                        metadata: {
                            ...(invoice.metadata || {}),
                            refund: {
                                id: manualRefundId,
                                amount: refundAmount,
                                reason: reason || null,
                                note: note || null,
                                source: "cash_manual",
                                initiatedBy: "vendor initiated",
                                refundedAt: new Date().toISOString(),
                                transactionId: tid,
                            },
                        },
                    }).where(eq(memberInvoices.id, transaction.invoiceId!));
                }
            }

            if (packageId) {
                const memberPackage = await tx.query.memberPackages.findFirst({
                    where: (pkg, { and, eq }) => and(eq(pkg.id, packageId), eq(pkg.locationId, lid)),
                });

                if (memberPackage) {
                    await tx.update(memberPackages).set({
                        ...(amountType === "full" ? { status: "incomplete" } : {}),
                        updated: new Date(),
                        metadata: {
                            ...(memberPackage.metadata || {}),
                            refund: {
                                id: manualRefundId,
                                amount: refundAmount,
                                reason: reason || null,
                                note: note || null,
                                source: "cash_manual",
                                initiatedBy: "vendor initiated",
                                refundedAt: new Date().toISOString(),
                                transactionId: tid,
                            },
                        },
                    }).where(eq(memberPackages.id, packageId));

                    if (amountType === "full") {
                        const now = new Date();
                        await tx.update(reservations).set({
                            status: "cancelled_by_vendor",
                            cancelledAt: now,
                            cancelledReason: "Cancelled due to package refund",
                            updated: now,
                        }).where(and(
                            eq(reservations.memberPackageId, packageId),
                            eq(reservations.locationId, lid),
                            gte(reservations.startOn, now),
                            eq(reservations.status, "confirmed")
                        ));
                    }
                }
            }
        });

        return status(200, {
            success: true,
            refunded: true,
            transactionId: tid,
            refundId: manualRefundId,
            amount: refundAmount,
            message: "Cash refund recorded successfully",
        });
    }, {
        body: t.Object({
            amountType: t.Union([t.Literal("full"), t.Literal("partial")]),
            amount: t.Optional(t.Number()),
            reason: t.Optional(t.String()),
            note: t.Optional(t.String()),
        }),
    });
