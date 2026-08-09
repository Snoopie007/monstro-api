import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import { chargeWallet } from "@/libs/wallet";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { memberInvoices, memberSubscriptionAddons, memberSubscriptions, transactions } from "@subtrees/schemas";
import { addInterval, PENDING_TRANSACTION_STATUS } from "./shared";
import { getCurrency } from "@/utils";
import type { InvoiceItem } from "@subtrees/types";
import type { Currency } from "@subtrees/types/currency";
import { enqueueSubscriptionAddonJob } from "@/queues";
import { getSubscriptionAddonOverview } from "../addonsBundles/subscriptionAddons";
import { hasConflictingSubscriptionAddonPricing } from "../addonsBundles/subscriptionAddonPricing";
import { activateBundlePurchase } from "../addonsBundles/bundlePurchases";

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

        if (invoice.memberSubscriptionAddonId) {
            const purchase = await db.query.memberSubscriptionAddons.findFirst({
                where: eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId),
                columns: { status: true, memberSubscriptionId: true },
            });
            if (purchase && ["canceled", "expired"].includes(purchase.status)) {
                return status(409, { error: "Canceled or expired add-on invoices cannot be marked paid" });
            }
            if (purchase && await hasConflictingSubscriptionAddonPricing(
                purchase.memberSubscriptionId,
                [],
                invoice.forPeriodStart ?? new Date(),
            )) {
                return status(409, { error: "This add-on would apply a conflicting subscription price" });
            }
        }

        let walletChargeMetadata: Record<string, unknown> | null = null;
        const location = await db.query.locations.findFirst({
            where: (l, { eq }) => eq(l.id, lid),
            columns: {
                vendorId: true,
                country: true,
            },
        });

        if (!location) {
            return status(404, { error: "Location not found" });
        }

        const subscriptionInvoiceContext = invoice.memberPlanId
            ? await db.query.memberSubscriptions.findFirst({
                where: (s, { eq }) => eq(s.id, invoice.memberPlanId!),
                with: {
                    pricing: true,
                },
            })
            : null;
        const nextSubscriptionPeriod = subscriptionInvoiceContext?.pricing
            ? {
                start: new Date(subscriptionInvoiceContext.currentPeriodEnd),
                end: addInterval(
                    new Date(subscriptionInvoiceContext.currentPeriodEnd),
                    subscriptionInvoiceContext.pricing.interval || "month",
                    subscriptionInvoiceContext.pricing.intervalThreshold || 1,
                ),
            }
            : null;
        const nextSubscriptionOverview = subscriptionInvoiceContext?.paymentType === "cash" && nextSubscriptionPeriod
            ? await getSubscriptionAddonOverview(
                lid,
                subscriptionInvoiceContext.id,
                nextSubscriptionPeriod.start,
                nextSubscriptionPeriod.end,
            )
            : null;

        if (subscriptionInvoiceContext?.paymentType === "cash") {
            const sub = subscriptionInvoiceContext;

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

        const addonRenewal: { value: { purchaseId: string; runAt: Date } | null } = { value: null };
        const bundlePurchase: { value: string | null } = { value: null };
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
            if (invoice.memberSubscriptionAddonId) {
                const purchase = await tx.query.memberSubscriptionAddons.findFirst({
                    where: eq(memberSubscriptionAddons.id, invoice.memberSubscriptionAddonId),
                    with: { addon: true },
                });
                if (purchase) {
                    bundlePurchase.value = purchase.bundlePurchaseId;
                    const periodStart = invoice.forPeriodStart ?? new Date();
                    const periodEnd = purchase.addon.billingType === "recurring"
                        ? addInterval(periodStart, purchase.addon.interval || "month", purchase.addon.intervalThreshold || 1)
                        : null;
                    await tx.update(memberSubscriptionAddons).set({
                        status: "active",
                        paidPeriodStartsAt: periodStart,
                        paidPeriodEndsAt: periodEnd,
                        nextBillAt: periodEnd,
                        updated: new Date(),
                    }).where(eq(memberSubscriptionAddons.id, purchase.id));
                    if (periodEnd) addonRenewal.value = { purchaseId: purchase.id, runAt: periodEnd };
                }
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
                        const currency = getCurrency(location.country);
                        if (!existingDraft) {
                            const invoicePricing = nextSubscriptionOverview?.effectivePricing ?? sub.pricing;
                            const lineItems: InvoiceItem[] = [{
                                name: invoicePricing.name,
                                quantity: 1,
                                price: invoicePricing.price,
                                discount: 0,
                                billingSource: { type: "subscription", memberSubscriptionId: sub.id },
                                pricingSource: nextSubscriptionOverview?.pricingSource ?? { type: "base" },
                                basePlanPricingId: sub.pricing.id,
                                effectivePlanPricingId: invoicePricing.id,
                            }];
                            const [nextInvoice] = await tx.insert(memberInvoices).values({
                                memberId: sub.memberId,
                                locationId: sub.locationId,
                                memberPlanId: sub.id,
                                description: `${invoicePricing.name} - Billing Period`,
                                items: lineItems,
                                subTotal: invoicePricing.price,
                                total: invoicePricing.price,
                                tax: 0,
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
                                },
                            }).returning();

                            if (!nextInvoice) {
                                return;
                            }

                            const [transaction] = await tx.insert(transactions).values({
                                memberId: sub.memberId,
                                locationId: sub.locationId,
                                description: `${invoicePricing.name} - Recurring Payment`,
                                type: "inbound",
                                status: PENDING_TRANSACTION_STATUS,
                                paymentType: "cash",
                                total: invoicePricing.price,
                                subTotal: invoicePricing.price,
                                tax: 0,
                                currency: (currency || "USD") as Currency,
                            }).returning({ id: transactions.id });
                            assert(transaction);
                            await tx.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, nextInvoice.id));
                        }
                    }
                }
            }
        });

        if (addonRenewal.value) {
            try {
                await enqueueSubscriptionAddonJob("renew", addonRenewal.value.purchaseId, addonRenewal.value.runAt);
            } catch (error) {
                console.error("Add-on was paid but its renewal job could not be scheduled", error);
            }
        }

        if (bundlePurchase.value) {
            try {
                const activation = await activateBundlePurchase(lid, bundlePurchase.value);
                if (activation.status === "ready") {
                    await Promise.all(activation.addonPurchaseIds.map((purchaseId) =>
                        enqueueSubscriptionAddonJob("activate", purchaseId)
                    ));
                }
            } catch (error) {
                console.error("Add-on was paid but its bundle could not be reconciled", error);
            }
        }

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
