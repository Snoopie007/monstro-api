import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, transactions } from "@subtrees/schemas";
import { isFuture } from "date-fns";
import type Elysia from "elysia";
import { and, eq } from "drizzle-orm";
import { getNextBillingDate } from "./shared";
import { calculateChargeDetails, getAdditionalFeesForCheckout, getCurrency } from "@/utils";

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

        if (!isTrialing) {
            const existingDraft = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(
                    eq(inv.memberPlanId, sid),
                    eq(inv.status, "draft")
                ),
            });

            if (!existingDraft) {
                const additionalFees = await getAdditionalFeesForCheckout({
                    locationId: lid,
                    checkoutType: "subscription",
                });
                const chargeDetails = calculateChargeDetails({
                    amount: sub.pricing.price,
                    taxRate: 0,
                    usagePercent: sub.location.locationState?.usagePercent ?? 0,
                    additionalFees,
                });
                const lineItems = [{
                    kind: "item" as const,
                    name: sub.pricing.name,
                    description: "Subscription billing period",
                    quantity: 1,
                    price: chargeDetails.unitCost,
                }, ...chargeDetails.additionalFeeLines];

                const currency = getCurrency(sub.location.country);
                const [invoice] = await db.insert(memberInvoices).values({
                    memberId: sub.memberId,
                    locationId: lid,
                    memberPlanId: sid,
                    description: `${sub.pricing.name} - Billing Period`,
                    items: lineItems,
                    subTotal: chargeDetails.subTotal,
                    total: chargeDetails.total,
                    tax: chargeDetails.tax,
                    currency: currency || "usd",
                    status: "draft",
                    dueDate: new Date(sub.currentPeriodEnd),
                    paymentType: "cash",
                    invoiceType: "recurring",
                    forPeriodStart: new Date(sub.currentPeriodStart),
                    forPeriodEnd: new Date(sub.currentPeriodEnd),
                    metadata: {
                        type: "from-subscription",
                        subscriptionId: sid,
                    },
                }).returning();

                if (invoice) {
                    const [transaction] = await db.insert(transactions).values({
                        memberId: sub.memberId,
                        locationId: lid,
                        description: `${sub.pricing.name} - Recurring Payment`,
                        type: "inbound",
                        status: "failed",
                        paymentType: "cash",
                        total: chargeDetails.total,
                        subTotal: chargeDetails.subTotal,
                        tax: chargeDetails.tax,
                        feeAmount: chargeDetails.feesAmount,
                        items: lineItems,
                        currency: currency || "usd",
                    }).returning({ id: transactions.id });
                    assert(transaction);
                    await db.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoice.id));
                }
            }
        }

        await db.transaction(async (tx) => {
            await tx.update(memberSubscriptions).set({
                status: isTrialing ? "trialing" : "active",
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
            }
        });

        return status(200, {
            status: isTrialing ? "trialing" : "active",
            nextBillingAt: getNextBillingDate(sub),
            scheduledJobKey: null,
        });
    });
}
