import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, promos, transactions } from "@subtrees/schemas";
import { isFuture } from "date-fns";
import type Elysia from "elysia";
import { and, eq, sql } from "drizzle-orm";
import { getNextBillingDate } from "./shared";
import { buildSubscriptionInvoiceQuote } from "../invoices/subscriptionQuote";

export async function activateCashSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/activate-cash", async ({ params, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            with: {
                member: {
                    columns: {
                        firstName: true,
                        lastName: true,
                        email: true,
                    },
                },
                pricing: true,
                location: {
                    with: {
                        taxRates: true,
                        locationState: true,
                    },
                    columns: {
                        country: true,
                        name: true,
                        email: true,
                        phone: true,
                        address: true,
                        vendorId: true,
                    },
                },
            },
        });

        if (!sub || !sub.pricing || !sub.member || !sub.location) {
            return status(404, { error: "Subscription not found" });
        }

        const isTrialing = !!(sub.trialEnd && isFuture(sub.trialEnd));
        const promoMeta = sub.metadata?.promo as {
            id?: string;
            applied?: boolean;
            discount?: { amount: number; type?: "fixed_amount" | "percentage"; value?: number };
        } | undefined;
        const discount = promoMeta?.discount
            ? {
                type: promoMeta.discount.type ?? "fixed_amount",
                value: promoMeta.discount.value ?? promoMeta.discount.amount,
            }
            : undefined;

        if (!isTrialing) {
            const existingDraft = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(
                    eq(inv.memberPlanId, sid),
                    eq(inv.status, "draft")
                ),
            });

            if (!existingDraft) {
                const quote = await buildSubscriptionInvoiceQuote({
                    locationId: lid,
                    subscriptionId: sid,
                    subscriptionMetadata: sub.metadata,
                    pricing: sub.pricing,
                    location: sub.location,
                    discount,
                });
                const [invoice] = await db.insert(memberInvoices).values({
                    memberId: sub.memberId,
                    locationId: lid,
                    memberPlanId: sid,
                    description: quote.invoiceDescription,
                    items: quote.items,
                    subTotal: quote.subTotal,
                    total: quote.total,
                    tax: quote.tax,
                    currency: quote.currency,
                    status: "draft",
                    dueDate: new Date(sub.currentPeriodEnd),
                    paymentType: "cash",
                    invoiceType: "recurring",
                    forPeriodStart: new Date(sub.currentPeriodStart),
                    forPeriodEnd: new Date(sub.currentPeriodEnd),
                    metadata: {
                        type: "from-subscription",
                        subscriptionId: sid,
                        platformFeeAmount: quote.platformFeeAmount,
                    },
                }).returning();

                if (invoice) {
                    const [transaction] = await db.insert(transactions).values({
                        memberId: sub.memberId,
                        locationId: lid,
                        description: quote.transactionDescription,
                        type: "inbound",
                        status: "failed",
                        paymentType: "cash",
                        total: quote.total,
                        subTotal: quote.subTotal,
                        tax: quote.tax,
                        feeAmount: quote.platformFeeAmount,
                        items: quote.items,
                        currency: quote.currency,
                    }).returning({ id: transactions.id });
                    assert(transaction);
                    await db.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoice.id));
                }
            }
        }

        await db.transaction(async (tx) => {
            await tx.update(memberSubscriptions).set({
                status: isTrialing ? "trialing" : "active",
                ...(!isTrialing && promoMeta ? {
                    metadata: {
                        ...(sub.metadata || {}),
                        promo: { ...promoMeta, applied: true },
                    },
                } : {}),
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, sid));

            if (!isTrialing) {
                await tx.update(memberLocations).set({
                    status: "active",
                    updated: new Date(),
                }).where(and(
                    eq(memberLocations.memberId, sub.memberId),
                    eq(memberLocations.locationId, lid),
                ));

                if (promoMeta?.id && !promoMeta.applied) {
                    await tx.update(promos).set({
                        redemptionCount: sql`${promos.redemptionCount} + 1`,
                        updated: new Date(),
                    }).where(eq(promos.id, promoMeta.id));
                }
            }
        });

        return status(200, {
            status: isTrialing ? "trialing" : "active",
            nextBillingAt: getNextBillingDate(sub),
            scheduledJobKey: null,
        });
    });
}
