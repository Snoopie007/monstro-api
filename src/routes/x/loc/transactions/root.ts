import { Elysia, t } from "elysia";
import { and, eq, gte, sql } from "drizzle-orm";
import { retryTransactionRoutes } from "./retry";
import { db } from "@/db/db";
import {
    courseEnrollments,
    eventRegistrations,
    memberInvoices,
    memberPackages,
    orders,
    reservations,
    transactions,
} from "@subtrees/schemas";
import { AuthorizePaymentGateway, AuthorizeTransportError, SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { getRefundAmounts } from "@/utils/refunds";


function getRefundPlanIds(txMeta: Record<string, unknown>, invoiceMemberPlanId: string | null) {
    const packageId =
        (typeof txMeta.memberPackageId === "string" && txMeta.memberPackageId)
        || (typeof txMeta.packageId === "string" && txMeta.packageId)
        || (invoiceMemberPlanId?.startsWith("pkg_") ? invoiceMemberPlanId : null);

    const subscriptionId =
        (typeof txMeta.memberSubscriptionId === "string" && txMeta.memberSubscriptionId)
        || (typeof txMeta.subscriptionId === "string" && txMeta.subscriptionId)
        || (invoiceMemberPlanId && !invoiceMemberPlanId.startsWith("pkg_") ? invoiceMemberPlanId : null);

    return { packageId, subscriptionId };
}

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
                        memberPlanId: true,
                    },
                },
            },
        });

        if (!transaction) {
            return status(404, { error: "Transaction not found" });
        }
        const txMeta = (transaction.metadata as Record<string, unknown> | null) || {};
        if (txMeta.gatewayService === "authorize") {
            if (transaction.refunded) {
                return status(200, {
                    success: true,
                    refunded: true,
                    transactionId: tid,
                    refundId: typeof txMeta.authorizeRefundTransactionId === "string"
                        ? txMeta.authorizeRefundTransactionId
                        : null,
                    amount: transaction.refundedAmount,
                    message: "Authorize.net refund already processed",
                });
            }
            if (amountType !== "full") {
                return status(400, { error: "Authorize.net refunds only support full refunds" });
            }
            if (transaction.invoice) {
                return status(409, { error: "Authorize.net refunds are limited to standalone Charge Item transactions" });
            }
            const [linkedOrder, linkedRegistration, linkedEnrollment] = await Promise.all([
                db.query.orders.findFirst({ where: (order, { eq }) => eq(order.transactionId, tid), columns: { id: true } }),
                db.query.eventRegistrations.findFirst({ where: (registration, { eq }) => eq(registration.transactionId, tid), columns: { id: true } }),
                db.query.courseEnrollments.findFirst({ where: (enrollment, { eq }) => eq(enrollment.transactionId, tid), columns: { id: true } }),
            ]);
            if (linkedOrder || linkedRegistration || linkedEnrollment) {
                return status(409, { error: "Authorize.net refunds are limited to standalone Charge Item transactions" });
            }
            if (transaction.type !== "inbound" || transaction.status !== "paid") {
                return status(400, { error: "Only paid standalone transactions can be refunded" });
            }

            const integrationId = txMeta.authorizeIntegrationId;
            if (typeof integrationId !== "string") {
                return status(400, { error: "Authorize.net integration is missing" });
            }
            const integration = await db.query.integrations.findFirst({
                where: (candidate, { and, eq }) => and(
                    eq(candidate.id, integrationId),
                    eq(candidate.locationId, lid),
                    eq(candidate.service, "authorize"),
                ),
                columns: { apiKey: true, secretKey: true },
            });
            if (!integration?.apiKey || !integration.secretKey) {
                return status(404, { error: "Authorize.net integration not found" });
            }
            const providerId = transaction.paymentIntentId
                || (typeof txMeta.authorizeTransactionId === "string" ? txMeta.authorizeTransactionId : null);
            if (!providerId) return status(400, { error: "No Authorize.net transaction ID found" });
            const authorize = new AuthorizePaymentGateway(integration.apiKey, integration.secretKey);

            if (txMeta.authorizeRefundState === "pending") {
                let details;
                try {
                    details = await authorize.getTransactionDetails(providerId);
                } catch (error) {
                    if (error instanceof AuthorizeTransportError) {
                        return status(503, { error: "Authorize.net refund status is unknown", code: "REFUND_UNCERTAIN" });
                    }
                    throw error;
                }
                if (
                    details.transactionStatus !== "voided"
                    && details.transactionStatus !== "refunded"
                    && details.transactionStatus !== "refundPendingSettlement"
                    && details.transactionStatus !== "refundSettledSuccessfully"
                ) {
                    return status(409, { error: "Authorize.net refund is still being resolved", code: "REFUND_PENDING" });
                }
                const operation = details.transactionStatus === "voided" ? "void" : "refund";
                await db.update(transactions).set({
                    refunded: true,
                    refundedAmount: operation === "void" ? 0 : transaction.total,
                    metadata: {
                        ...txMeta,
                        authorizeRefundState: "completed",
                        authorizeRefundOperation: operation,
                        authorizeRefundTransactionId: providerId,
                        authorizeRefundStatus: details.transactionStatus,
                    },
                    updated: new Date(),
                }).where(eq(transactions.id, tid));
            } else {
                let details;
                try {
                    details = await authorize.getTransactionDetails(providerId);
                } catch (error) {
                    if (error instanceof AuthorizeTransportError) {
                        return status(503, { error: "Authorize.net refund status is unknown", code: "REFUND_UNCERTAIN" });
                    }
                    throw error;
                }
                const providerStatus = details.transactionStatus;
                if (!providerStatus) throw new Error("Authorize.net transaction status is missing");

                if (
                    providerStatus === "voided"
                    || providerStatus === "refunded"
                    || providerStatus === "refundPendingSettlement"
                    || providerStatus === "refundSettledSuccessfully"
                ) {
                    const operation = providerStatus === "voided" ? "void" : "refund";
                    await db.update(transactions).set({
                        refunded: true,
                        refundedAmount: operation === "void" ? 0 : transaction.total,
                        metadata: {
                            ...txMeta,
                            authorizeRefundState: "completed",
                            authorizeRefundOperation: operation,
                            authorizeRefundTransactionId: providerId,
                            authorizeRefundStatus: providerStatus,
                        },
                        updated: new Date(),
                    }).where(and(eq(transactions.id, tid), eq(transactions.refunded, false)));
                } else {
                    const operation = providerStatus === "capturedPendingSettlement" || providerStatus === "authorizedPendingCapture"
                        ? "void"
                        : providerStatus === "settledSuccessfully"
                            ? "refund"
                            : null;
                    if (!operation) {
                        throw new Error(`Authorize.net transaction cannot be refunded from status ${providerStatus}`);
                    }
                    const pendingMetadata = {
                        ...txMeta,
                        authorizeRefundState: "pending",
                        authorizeRefundRequestedAt: new Date().toISOString(),
                    };
                    const [claim] = await db.update(transactions).set({
                        metadata: pendingMetadata,
                        updated: new Date(),
                    }).where(and(
                        eq(transactions.id, tid),
                        eq(transactions.refunded, false),
                        sql`coalesce(${transactions.metadata}->>'authorizeRefundState', '') <> 'pending'`,
                    )).returning({ id: transactions.id });
                    if (!claim) {
                        const current = await db.query.transactions.findFirst({
                            where: (candidate, { eq }) => eq(candidate.id, tid),
                        });
                        if (current?.refunded) {
                            return status(200, {
                                success: true,
                                refunded: true,
                                transactionId: tid,
                                refundId: typeof current.metadata?.authorizeRefundTransactionId === "string"
                                    ? current.metadata.authorizeRefundTransactionId
                                    : null,
                                amount: current.refundedAmount,
                                message: "Authorize.net refund already processed",
                            });
                        }
                        return status(409, { error: "Authorize.net refund is still being resolved", code: "REFUND_PENDING" });
                    }

                    try {
                        const authorizeCardNumber = details.payment?.creditCard?.cardNumber;
                        const authorizeCardLast4 = authorizeCardNumber?.match(/\d{4}$/)?.[0];
                        if (operation === "refund" && !authorizeCardLast4) {
                            throw new Error("Authorize.net refund card details are unavailable");
                        }
                        const providerResult = operation === "void"
                            ? await authorize.voidTransaction(providerId)
                            : await authorize.refundTransaction(
                                providerId,
                                transaction.total,
                                authorizeCardLast4!,
                            );
                        await db.update(transactions).set({
                            refunded: true,
                            refundedAmount: operation === "void" ? 0 : transaction.total,
                            metadata: {
                                ...pendingMetadata,
                                authorizeRefundState: "completed",
                                authorizeRefundOperation: operation,
                                authorizeRefundTransactionId: providerResult.transId ?? providerId,
                                authorizeRefundStatus: providerResult.transactionStatus ?? providerStatus,
                            },
                            updated: new Date(),
                        }).where(and(eq(transactions.id, tid), eq(transactions.refunded, false)));
                    } catch (error) {
                        if (error instanceof AuthorizeTransportError) {
                            return status(503, { error: "Authorize.net refund status is unknown", code: "REFUND_UNCERTAIN" });
                        }
                        await db.update(transactions).set({
                            metadata: {
                                ...pendingMetadata,
                                authorizeRefundState: "failed",
                                authorizeRefundError: error instanceof Error ? error.message : "Authorize.net refund failed",
                            },
                            updated: new Date(),
                        }).where(eq(transactions.id, tid));
                        throw error;
                    }
                }
            }

            const completed = await db.query.transactions.findFirst({
                where: (candidate, { eq }) => eq(candidate.id, tid),
            });
            if (!completed?.refunded) {
                return status(409, { error: "Authorize.net refund was not finalized", code: "REFUND_PENDING" });
            }
            return status(200, {
                success: true,
                refunded: true,
                transactionId: tid,
                refundId: typeof completed.metadata?.authorizeRefundTransactionId === "string"
                    ? completed.metadata.authorizeRefundTransactionId
                    : null,
                amount: completed.refundedAmount,
                message: completed.metadata?.authorizeRefundOperation === "void"
                    ? "Authorize.net transaction voided successfully"
                    : "Authorize.net refund processed successfully",
            });
        }

        if (transaction.refunded) {
            return status(400, { error: "Transaction already refunded" });
        }

        if (transaction.type !== "inbound" || transaction.status !== "paid") {
            return status(400, { error: "Only paid inbound transactions can be refunded" });
        }

        const { packageId, subscriptionId } = getRefundPlanIds(
            txMeta,
            transaction.invoice?.memberPlanId || null
        );

        if (subscriptionId) {
            return status(409, {
                error: "Please cancel the subscription instead to refund",
                code: "SUBSCRIPTION_REFUND_BLOCKED",
            });
        }

		if (transaction.paymentType === "cash") {
			return status(400, { error: "Cash transactions cannot be refunded through Stripe" });
		}

		const refundAmounts = await getRefundAmounts(lid, transaction.total, transaction.items);
		let refundAmount = refundAmounts.refundableAmount;
		if (amountType === "partial") {
			if (typeof amount !== "number" || amount <= 0) {
				return status(400, { error: "Valid amount is required for partial refunds" });
			}
			if (amount > refundAmounts.refundableAmount) {
				return status(400, {
					error: "Refund amount cannot exceed refundable amount",
					maximumRefundableAmount: refundAmounts.refundableAmount,
				});
			}
			refundAmount = amount;
		}
		if (refundAmount <= 0) {
			return status(400, { error: "This transaction has no refundable amount" });
		}

		if (txMeta.gatewayService === "square") {
			const squarePaymentId = typeof txMeta.squarePaymentId === "string"
				? txMeta.squarePaymentId
				: typeof txMeta.chargeId === "string"
					? txMeta.chargeId
					: null;

			if (!squarePaymentId) {
				return status(400, { error: "Square payment ID not found in transaction metadata" });
			}

			const squareIntegration = await db.query.integrations.findFirst({
				where: (ig, { and, eq }) => and(eq(ig.locationId, lid), eq(ig.service, "square")),
				columns: { accessToken: true, metadata: true },
			});

			if (!squareIntegration || !squareIntegration.accessToken) {
				return status(404, { error: "Square integration not found" });
			}

			const square = new SquarePaymentGateway(squareIntegration.accessToken);

			const refund = await square.refundPayment(
				squarePaymentId,
				refundAmount,
				reason || "Vendor requested refund",
			);

			await db.transaction(async (tx) => {
				await tx.update(transactions).set({
					refunded: true,
					refundedAmount: refundAmount,
					updated: new Date(),
					metadata: {
						...txMeta,
						squarePaymentId,
						squareRefundId: refund.id,
						squareRefundStatus: refund.status,
						gatewayService: "square",
						refund: {
							id: refund.id,
							amount: refundAmount,
							nonRefundableAmount: refundAmounts.nonRefundableAmount,
							reason: reason || null,
							note: note || null,
							refundedAt: new Date().toISOString(),
						},
					},
				}).where(eq(transactions.id, tid));

				if (transaction.invoice) {
					const invoice = await tx.query.memberInvoices.findFirst({
						where: eq(memberInvoices.id, transaction.invoice.id),
					});
					if (invoice) {
						await tx.update(memberInvoices).set({
							...(amountType === "full" ? { status: "void", paid: false } : {}),
							updated: new Date(),
						}).where(eq(memberInvoices.id, transaction.invoice.id));
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
				nonRefundableAmount: refundAmounts.nonRefundableAmount,
				message: "Square refund processed successfully",
			});
		}

		const integration = await db.query.integrations.findFirst({
            where: (ig, { and, eq }) => and(eq(ig.locationId, lid), eq(ig.service, "stripe")),
            columns: { accountId: true, accessToken: true },
        });

        if (!integration || !integration.accountId || !integration.accessToken) {
            return status(404, { error: "Stripe integration not found" });
        }

        const paymentIntentId =
            transaction.paymentIntentId
            || (typeof txMeta.paymentIntentId === "string" ? txMeta.paymentIntentId : undefined);

        if (!paymentIntentId) {
            return status(400, { error: "No payment intent found for transaction" });
        }

		const stripeGateway = new StripePaymentGateway(integration.accessToken ?? "");
		const refund = await stripeGateway.createRefund(paymentIntentId, refundAmount, transaction.currency);

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
						nonRefundableAmount: refundAmounts.nonRefundableAmount,
                        reason: reason || null,
                        note: note || null,
                        refundedAt: new Date().toISOString(),
                    },
                },
            }).where(eq(transactions.id, tid));

            if (transaction.invoice) {
                const invoice = await tx.query.memberInvoices.findFirst({
                    where: eq(memberInvoices.id, transaction.invoice.id),
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
                    }).where(eq(memberInvoices.id, transaction.invoice.id));
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
			nonRefundableAmount: refundAmounts.nonRefundableAmount,
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
                        memberPlanId: true,
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
        const { packageId, subscriptionId } = getRefundPlanIds(
            txMeta,
            transaction.invoice?.memberPlanId || null
        );

        if (subscriptionId) {
            return status(409, {
                error: "Please cancel the subscription instead to refund",
                code: "SUBSCRIPTION_REFUND_BLOCKED",
            });
        }

		const refundAmounts = await getRefundAmounts(lid, transaction.total, transaction.items);
		let refundAmount = refundAmounts.refundableAmount;
		if (amountType === "partial") {
			if (typeof amount !== "number" || amount <= 0) {
				return status(400, { error: "Valid amount is required for partial refunds" });
			}
			if (amount > refundAmounts.refundableAmount) {
				return status(400, {
					error: "Refund amount cannot exceed refundable amount",
					maximumRefundableAmount: refundAmounts.refundableAmount,
				});
			}
			refundAmount = amount;
		}
		if (refundAmount <= 0) {
			return status(400, { error: "This transaction has no refundable amount" });
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
						nonRefundableAmount: refundAmounts.nonRefundableAmount,
                        reason: reason || null,
                        note: note || null,
                        source: "cash_manual",
                        initiatedBy: "vendor initiated",
                        refundedAt: new Date().toISOString(),
                    },
                },
            }).where(eq(transactions.id, tid));

            if (transaction.invoice) {
                const invoice = await tx.query.memberInvoices.findFirst({
                    where: eq(memberInvoices.id, transaction.invoice.id),
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
                    }).where(eq(memberInvoices.id, transaction.invoice.id));
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
			nonRefundableAmount: refundAmounts.nonRefundableAmount,
            message: "Cash refund recorded successfully",
        });
    }, {
        body: t.Object({
            amountType: t.Union([t.Literal("full"), t.Literal("partial")]),
            amount: t.Optional(t.Number()),
            reason: t.Optional(t.String()),
            note: t.Optional(t.String()),
        }),
    })
    .use(retryTransactionRoutes);
