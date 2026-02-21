import { db } from "@/db/db";
import { chargeWallet } from "@/libs/wallet";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";
import { addInterval, PENDING_TRANSACTION_STATUS } from "./shared";

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

        if (invoice.memberPlanId) {
            const sub = await db.query.memberSubscriptions.findFirst({
                where: (s, { eq }) => eq(s.id, invoice.memberPlanId!),
                with: {
                    pricing: true,
                },
            });

            if (sub?.paymentType === "cash") {
                const location = await db.query.locations.findFirst({
                    where: (l, { eq }) => eq(l.id, lid),
                    columns: {
                        vendorId: true,
                    },
                });

                if (!location?.vendorId) {
                    return status(422, {
                        error: "Location vendor is required to process cash renewal",
                        code: "MISSING_VENDOR",
                    });
                }

                const walletFee = Math.floor(invoice.total * 0.007);
                if (walletFee > 0) {
                    const charged = await chargeWallet({
                        lid,
                        vendorId: location.vendorId,
                        amount: walletFee,
                        description: `Membership renewal for ${sub.pricing?.name || "subscription"}`,
                    });

                    if (!charged) {
                        return status(402, {
                            error: "Insufficient wallet balance to process cash renewal",
                            code: "WALLET_CHARGE_FAILED",
                        });
                    }
                }

                walletChargeMetadata = {
                    walletFee,
                    walletChargeSource: "cash_subscription_mark_paid",
                    walletChargedAt: new Date().toISOString(),
                };
            }
        }

        await db.transaction(async (tx) => {
            const existingTransaction = await tx.query.transactions.findFirst({
                where: (tr, { and, eq }) => and(
                    eq(tr.invoiceId, iid),
                    eq(tr.status, PENDING_TRANSACTION_STATUS)
                ),
                columns: {
                    metadata: true,
                },
            });

            await tx.update(memberInvoices).set({
                status: "paid",
                paid: true,
                updated: new Date(),
            }).where(eq(memberInvoices.id, iid));

            const paymentMetadata = {
                ...((existingTransaction?.metadata as Record<string, unknown> | null) || {}),
                notes: notes || "",
                markedPaidAt: new Date().toISOString(),
                ...(walletChargeMetadata || {}),
            };

            if (existingTransaction) {
                await tx.update(transactions).set({
                    status: "paid",
                    paymentType: normalizedPaymentType,
                    chargeDate: paidDate ? new Date(paidDate) : new Date(),
                    metadata: paymentMetadata,
                    updated: new Date(),
                }).where(and(eq(transactions.invoiceId, iid), eq(transactions.status, PENDING_TRANSACTION_STATUS)));
            } else {
                await tx.insert(transactions).values({
                    memberId: invoice.memberId,
                    locationId: lid,
                    invoiceId: iid,
                    description: invoice.description || "Invoice payment",
                    type: "inbound",
                    status: "paid",
                    paymentType: normalizedPaymentType,
                    total: invoice.total,
                    subTotal: invoice.subTotal,
                    tax: invoice.tax,
                    currency: invoice.currency || "usd",
                    chargeDate: paidDate ? new Date(paidDate) : new Date(),
                    metadata: paymentMetadata,
                    items: (invoice.items || []).map((item: any) => ({
                        name: item?.name || "Line item",
                        amount: Number(item?.price || 0),
                        quantity: Number(item?.quantity || 1),
                        tax: 0,
                    })),
                });
            }

            if (invoice.memberPlanId) {
                const sub = await tx.query.memberSubscriptions.findFirst({
                    where: (s, { eq }) => eq(s.id, invoice.memberPlanId!),
                    with: {
                        pricing: true,
                    },
                });

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

                        if (!existingDraft) {
                            const lineItems = [{
                                name: `${sub.pricing.name}`,
                                description: "Subscription renewal",
                                quantity: 1,
                                price: sub.pricing.price,
                                discount: 0,
                            }];
                            const [nextInvoice] = await tx.insert(memberInvoices).values({
                                memberId: sub.memberId,
                                locationId: sub.locationId,
                                memberPlanId: sub.id,
                                description: `${sub.pricing.name} - Billing Period`,
                                items: lineItems,
                                subTotal: sub.pricing.price,
                                total: sub.pricing.price,
                                tax: 0,
                                currency: sub.pricing.currency,
                                status: "draft",
                                dueDate: new Date(nextEnd),
                                paymentType: "cash",
                                invoiceType: "recurring",
                                forPeriodStart: nextStart,
                                forPeriodEnd: nextEnd,
                                metadata: {
                                    type: "from-subscription",
                                    subscriptionId: sub.id,
                                },
                            }).returning();

                            if (!nextInvoice) {
                                return;
                            }

                            await tx.insert(transactions).values({
                                memberId: sub.memberId,
                                locationId: sub.locationId,
                                invoiceId: nextInvoice.id,
                                description: `${sub.pricing.name} - Recurring Payment`,
                                type: "inbound",
                                status: PENDING_TRANSACTION_STATUS,
                                paymentType: "cash",
                                total: sub.pricing.price,
                                subTotal: sub.pricing.price,
                                tax: 0,
                                currency: sub.pricing.currency,
                                items: [{
                                    name: sub.pricing.name,
                                    amount: sub.pricing.price,
                                    quantity: 1,
                                    tax: 0,
                                }],
                            });
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
