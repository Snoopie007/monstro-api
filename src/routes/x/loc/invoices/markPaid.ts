import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import { Wallet } from "@/libs/wallet";
import type Elysia from "elysia";
import { t } from "elysia";
import { eq } from "drizzle-orm";
import { memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";
import { addInterval, PENDING_TRANSACTION_STATUS } from "./shared";
import { calculateChargeDetails, getAdditionalFeesForCheckout, getCurrency } from "@/utils";
import type { Currency } from "@subtrees/types/currency";

export async function markPaidInvoiceRoutes(app: Elysia) {
    return app.post("/:iid/mark-paid", async ({ params, body, status }) => {
        const { lid, iid } = params as { lid: string; iid: string };
        const { paymentType = "cash", paidDate, notes } = body;
        const normalizedPaymentType = paymentType === "cash" ? "cash" : "cash";

        const invoice = await db.query.memberInvoices.findFirst({
            where: (inv, { and, eq }) => and(eq(inv.id, iid), eq(inv.locationId, lid)),
        });

        if (!invoice) {
            return status(404, { error: "Invoice not found" });
        }

        if (invoice.status !== "sent") {
            return status(400, { error: "Invoice must be sent before marking as paid" });
        }

        let walletChargeMetadata: Record<string, unknown> | null = null;
        const location = await db.query.locations.findFirst({
            where: (l, { eq }) => eq(l.id, lid),
            columns: {
                vendorId: true,
                country: true,
            },
            with: {
                locationState: {
                    columns: { planId: true },
                },
                taxRates: {
                    columns: { percentage: true, isDefault: true },
                },
            },
        });

        if (!location) {
            return status(404, { error: "Location not found" });
        }

        const sub = invoice.memberPlanId
            ? await db.query.memberSubscriptions.findFirst({
                where: (s, { eq }) => eq(s.id, invoice.memberPlanId!),
                with: {
                    pricing: true,
                },
            })
            : undefined;

        if (sub?.paymentType === "cash") {
            const platformFeeAmount = typeof invoice.metadata?.platformFeeAmount === "number"
                ? Math.max(0, Math.floor(invoice.metadata.platformFeeAmount))
                : 0;

            if (platformFeeAmount > 0) {
                if (!location.vendorId) {
                    return status(422, {
                        error: "Location vendor is required to process cash renewal",
                        code: "MISSING_VENDOR",
                    });
                }

                const wallet = new Wallet(lid);
                const charged = await wallet.charge({
                    vendorId: location.vendorId,
                    amount: platformFeeAmount,
                    description: `Membership renewal for subscription ${sub.id}, invoice ${invoice.id}`,
                    deduplicate: true,
                });

                if (!charged) {
                    return status(402, {
                        error: "Insufficient wallet balance to process cash renewal",
                        code: "WALLET_CHARGE_FAILED",
                    });
                }
            }

            walletChargeMetadata = {
                walletFee: platformFeeAmount,
                walletChargeSource: "cash_subscription_mark_paid",
                walletChargedAt: new Date().toISOString(),
            };
        }

        await db.transaction(async (tx) => {
            const existingTransaction = invoice.transactionId
                ? await tx.query.transactions.findFirst({
                    where: eq(transactions.id, invoice.transactionId),
                })
                : undefined;
            if (invoice.transactionId) assert(existingTransaction);

            const paymentMetadata = {
                ...(existingTransaction?.metadata ?? {}),
                notes: notes || "",
                markedPaidAt: new Date().toISOString(),
                ...(walletChargeMetadata || {}),
            };

            let transactionId = invoice.transactionId;
            if (existingTransaction) {
                await tx.update(transactions).set({
                    status: "paid",
                    paymentType: normalizedPaymentType,
                    feeAmount: typeof invoice.metadata?.platformFeeAmount === "number"
                        ? invoice.metadata.platformFeeAmount
                        : existingTransaction.feeAmount,
                    chargeDate: paidDate ? new Date(paidDate) : new Date(),
                    metadata: paymentMetadata,
                    updated: new Date(),
                }).where(eq(transactions.id, existingTransaction.id));
            } else {
                const [transaction] = await tx.insert(transactions).values({
                    memberId: invoice.memberId,
                    locationId: lid,
                    description: invoice.description || "Invoice payment",
                    type: "inbound",
                    status: "paid",
                    paymentType: normalizedPaymentType,
                    total: invoice.total,
                    subTotal: invoice.subTotal,
                    tax: invoice.tax,
                    feeAmount: typeof invoice.metadata?.platformFeeAmount === "number"
                        ? invoice.metadata.platformFeeAmount
                        : 0,
                    currency: (invoice.currency || "USD") as Currency,
                    chargeDate: paidDate ? new Date(paidDate) : new Date(),
                    metadata: paymentMetadata,
                }).returning({ id: transactions.id });
                assert(transaction);
                transactionId = transaction.id;
            }

            await tx.update(memberInvoices).set({
                status: "paid",
                paid: true,
                transactionId,
                updated: new Date(),
            }).where(eq(memberInvoices.id, iid));
            if (invoice.memberPlanId) {
                if (sub && sub.pricing) {
                    const nextStart = new Date(sub.currentPeriodEnd);
                    const nextEnd = addInterval(nextStart, sub.pricing.interval || "month", sub.pricing.intervalThreshold || 1);

                    await tx.update(memberSubscriptions).set({
                        status: "active",
                        currentPeriodStart: nextStart,
                        currentPeriodEnd: nextEnd,
                        makeUpCredits: sub.allowMakeUpCarryOver ? sub.makeUpCredits : 0,
                        updated: new Date(),
                    }).where(eq(memberSubscriptions.id, sub.id));

                    if (sub.paymentType === "cash") {
                        const existingDraft = await tx.query.memberInvoices.findFirst({
                            where: (inv, { and, eq }) => and(
                                eq(inv.memberPlanId, sub.id),
                                eq(inv.status, "draft")
                            ),
                        });
                        const currency = getCurrency(location.country);
                        if (!existingDraft) {
                            const promo = sub.metadata?.promo as {
                                discount?: {
                                    amount: number;
                                    duration: number;
                                    type?: "fixed_amount" | "percentage";
                                    value?: number;
                                };
                            } | undefined;
                            const paidInvoices = await tx.query.memberInvoices.findMany({
                                where: (candidate, { and, eq }) => and(
                                    eq(candidate.memberPlanId, sub.id),
                                    eq(candidate.paid, true),
                                ),
                                columns: { id: true },
                            });
                            const discount = promo?.discount && paidInvoices.length < promo.discount.duration
                                ? {
                                    type: promo.discount.type ?? "fixed_amount",
                                    value: promo.discount.value ?? promo.discount.amount,
                                }
                                : undefined;
                            const additionalFees = await getAdditionalFeesForCheckout(lid, "subscription", "renewal");
                            const taxRate = location.taxRates.find((rate) => rate.isDefault) ?? location.taxRates[0];
                            const chargeDetails = calculateChargeDetails({
                                amount: sub.pricing.price,
                                discount,
                                taxRate: taxRate?.percentage ?? 0,
                                planId: location.locationState?.planId ?? 0,
                                additionalFees,
                            });
                            const lineItems = [{
                                name: `${sub.pricing.name}`,
                                description: "Subscription renewal",
                                quantity: 1,
                                price: chargeDetails.unitCost,
                                discount: chargeDetails.productDiscount,
                            }, ...chargeDetails.additionalFeeLines];
                            const [nextInvoice] = await tx.insert(memberInvoices).values({
                                memberId: sub.memberId,
                                locationId: sub.locationId,
                                memberPlanId: sub.id,
                                description: `${sub.pricing.name} - Billing Period`,
                                items: lineItems,
                                subTotal: chargeDetails.subTotal,
                                total: chargeDetails.total,
                                tax: chargeDetails.tax,
                                currency: (currency || "USD") as Currency,
                                status: "draft",
                                dueDate: new Date(nextEnd),
                                paymentType: "cash",
                                invoiceType: "recurring",
                                forPeriodStart: nextStart,
                                forPeriodEnd: nextEnd,
                                metadata: {
                                    type: "from-subscription",
                                    subscriptionId: sub.id,
                                    platformFeeAmount: chargeDetails.feesAmount,
                                },
                            }).returning();

                            if (!nextInvoice) {
                                return;
                            }

                            const [transaction] = await tx.insert(transactions).values({
                                memberId: sub.memberId,
                                locationId: sub.locationId,
                                description: `${sub.pricing.name} - Recurring Payment`,
                                type: "inbound",
                                status: PENDING_TRANSACTION_STATUS,
                                paymentType: "cash",
                                total: chargeDetails.total,
                                subTotal: chargeDetails.subTotal,
                                tax: chargeDetails.tax,
                                feeAmount: chargeDetails.feesAmount,
                                items: lineItems,
                                currency: (currency || "USD") as Currency,
                            }).returning({ id: transactions.id });
                            assert(transaction);
                            await tx.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, nextInvoice.id));
                        }
                    }
                }
            }
        });

        return status(200, {
            success: true,
            message: "Invoice marked as paid",
            invoice: { id: iid, status: "paid", paid: true },
        });
    }, {
        body: t.Object({
            paymentType: t.Optional(t.Union([t.Literal("cash"), t.Literal("check"), t.Literal("bank_transfer")])),
            paidDate: t.Optional(t.String()),
            notes: t.Optional(t.String()),
        }),
    });
}
