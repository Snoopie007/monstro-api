import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import { Wallet } from "@/libs/wallet";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { memberInvoices, memberSubscriptions, transactions } from "@/subtrees/schemas";
import { PENDING_TRANSACTION_STATUS } from "./shared";
import { quoteSubscriptionInvoice } from "./subscriptionQuote";
import type { Currency } from "@/subtrees/types/currency";
import { canEditLocationMember } from "@/utils/locationAccess";
import { getAdditionalFeesForCheckout } from "@/utils/additionalFees";
import { ensureCashInvoice } from "@/subtrees/utils/server/cashInvoices";
import { nextBillingBoundary } from "@/subtrees/utils/subscriptionBilling";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

export async function markPaidInvoiceRoutes(app: Elysia) {
    return app.post("/:iid/mark-paid", async ctx => {
        const { params, body, status } = ctx;
        const { lid, iid } = params as { lid: string; iid: string };
        const { paidDate, notes, expectedTotal } = body;
        const actor = ctx as typeof ctx & { vendorId?: string; staffId?: string; userId?: string };
        if (!await canEditLocationMember(lid, actor)) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
        const paidResponse = () => status(200, { success: true, message: "Invoice marked as paid", invoice: { id: iid, status: "paid", paid: true } });

        const invoice = await db.query.memberInvoices.findFirst({
            where: (inv, { and, eq }) => and(eq(inv.id, iid), eq(inv.locationId, lid)),
        });

        if (!invoice) {
            return status(404, { error: "Invoice not found" });
        }

        if (invoice.paymentType !== "cash") return status(400, { error: "Only cash invoices can be marked as paid" });
        if (invoice.paid || invoice.status === "paid") return paidResponse();
        if (expectedTotal !== undefined && expectedTotal !== invoice.total) return status(409, { error: "The invoice amount changed. Please review it again." });
        if (!["sent", "unpaid"].includes(invoice.status)) {
            return status(400, { error: "Invoice must be issued before marking as paid" });
        }

        let walletChargeMetadata: Record<string, unknown> | null = null;
        const location = await db.query.locations.findFirst({
            where: (l, { eq }) => eq(l.id, lid),
            columns: {
                vendorId: true,
                country: true,
                timezone: true,
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

        let chargeDate = new Date();
        if (paidDate) {
            if (!/^\d{4}-\d{2}-\d{2}$/.test(paidDate)) return status(400, { error: "Payment date must be YYYY-MM-DD" });
            chargeDate = fromZonedTime(`${paidDate}T12:00:00`, location.timezone);
            if (!Number.isFinite(chargeDate.getTime()) || formatInTimeZone(chargeDate, location.timezone, "yyyy-MM-dd") !== paidDate ||
                paidDate > formatInTimeZone(new Date(), location.timezone, "yyyy-MM-dd")) {
                return status(400, { error: "Choose a valid payment date that is not in the future" });
            }
        }

        const sub = invoice.memberPlanId
            ? await db.query.memberSubscriptions.findFirst({
                where: (s, { and, eq }) => and(eq(s.id, invoice.memberPlanId!), eq(s.locationId, lid)),
                with: {
                    pricing: true,
                },
            })
            : undefined;
        const renewalFees = sub?.paymentType === "cash" ? await getAdditionalFeesForCheckout(lid, "subscription", "renewal") : [];

        if (sub?.paymentType === "cash") {
            if (!sub.pricing) {
                return status(404, { error: "Subscription billing definition not found" });
            }
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

        const quotedTotal = invoice.total;
        const outcome = await db.transaction(async (tx) => {
            // Wallet debits have their own invoice-specific deduplication. Keep
            // them outside this transaction so the two-connection pool cannot
            // deadlock while another confirmation waits for the invoice lock.
            const [locked] = await tx.select().from(memberInvoices)
                .where(and(eq(memberInvoices.id, iid), eq(memberInvoices.locationId, lid))).for("update");
            if (!locked) return "missing";
            if (locked.paid || locked.status === "paid") return "paid";
            if (!["sent", "unpaid"].includes(locked.status) || locked.paymentType !== "cash" || locked.total !== quotedTotal) return "changed";
            const invoice = locked;
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
                    paymentType: "cash",
                    total: invoice.total,
                    subTotal: invoice.subTotal,
                    tax: invoice.tax,
                    feeAmount: typeof invoice.metadata?.platformFeeAmount === "number"
                        ? invoice.metadata.platformFeeAmount
                        : existingTransaction.feeAmount,
                    chargeDate,
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
                    paymentType: "cash",
                    total: invoice.total,
                    subTotal: invoice.subTotal,
                    tax: invoice.tax,
                    feeAmount: typeof invoice.metadata?.platformFeeAmount === "number"
                        ? invoice.metadata.platformFeeAmount
                        : 0,
                    items: invoice.items ?? [],
                    currency: (invoice.currency || "USD") as Currency,
                    chargeDate,
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
                await tx.select({ id: memberSubscriptions.id }).from(memberSubscriptions)
                    .where(and(eq(memberSubscriptions.id, invoice.memberPlanId), eq(memberSubscriptions.locationId, lid))).for("update");
                const sub = await tx.query.memberSubscriptions.findFirst({
                    where: and(eq(memberSubscriptions.id, invoice.memberPlanId), eq(memberSubscriptions.locationId, lid)),
                    with: { pricing: { with: { plan: true } } },
                });
                const matchesPeriod = sub?.currentPeriodStart && sub.currentPeriodEnd && (invoice.forPeriodStart && invoice.forPeriodEnd
                    ? invoice.forPeriodStart.getTime() === sub.currentPeriodStart.getTime() && invoice.forPeriodEnd.getTime() === sub.currentPeriodEnd.getTime()
                    : invoice.dueDate.getTime() === sub.currentPeriodEnd.getTime());
                if (sub?.pricing && sub.paymentType === "cash" && matchesPeriod &&
                    ["active", "past_due", "unpaid", "trialing"].includes(sub.status) && !sub.cancelAtPeriodEnd &&
                    (!sub.cancelAt || sub.currentPeriodEnd < sub.cancelAt)) {
                    const nextStart = new Date(sub.currentPeriodEnd);
                    const storedAnchor = typeof sub.metadata.cashBillingAnchor === "string" ? new Date(sub.metadata.cashBillingAnchor) : nextStart;
                    const anchor = Number.isFinite(storedAnchor.getTime()) ? storedAnchor : nextStart;
                    const nextEnd = nextBillingBoundary(anchor, nextStart, sub.pricing.interval || "month", sub.pricing.intervalThreshold || 1);

                    await tx.update(memberSubscriptions).set({
                        status: "active",
                        currentPeriodStart: nextStart,
                        currentPeriodEnd: nextEnd,
                        metadata: { ...sub.metadata, cashBillingAnchor: anchor.toISOString() },
                        makeUpCredits: sub.allowMakeUpCarryOver ? sub.makeUpCredits : 0,
                        updated: new Date(),
                    }).where(eq(memberSubscriptions.id, sub.id));

                    if (!sub.cancelAt || nextEnd < sub.cancelAt) {
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
                        const quote = quoteSubscriptionInvoice({
                            locationId: lid,
                            subscriptionId: sub.id,
                            parentId: sub.parentId,
                            subscriptionMetadata: sub.metadata,
                            pricing: sub.pricing,
                            location,
                            billingPhase: "renewal",
                            discount,
                            additionalFees: renewalFees,
                        });
                        await ensureCashInvoice(tx, {
                            subscriptionId: sub.id, locationId: lid, memberId: sub.memberId,
                            periodStart: nextStart, periodEnd: nextEnd, quote,
                        });
                    }
                }
            }
            return "paid";
        });

        if (outcome === "missing") return status(404, { error: "Invoice not found" });
        if (outcome === "changed") return status(409, { error: "The invoice changed. Please review it again." });
        return paidResponse();
    }, {
        body: t.Object({
            paymentType: t.Optional(t.Literal("cash")),
            paidDate: t.Optional(t.String()),
            notes: t.Optional(t.String({ maxLength: 2000 })),
            expectedTotal: t.Optional(t.Integer({ minimum: 0 })),
        }),
    });
}
