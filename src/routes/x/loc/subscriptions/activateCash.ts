import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";
import { isFuture } from "date-fns";
import type Elysia from "elysia";
import { eq } from "drizzle-orm";
import { getNextBillingDate } from "./shared";

export async function activateCashSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/activate-cash", async ({ params, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };

        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            with: {
                pricing: true,
            },
        });

        if (!sub || !sub.pricing) {
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
                const lineItems = [{
                    name: sub.pricing.name,
                    description: "Subscription billing period",
                    quantity: 1,
                    price: sub.pricing.price,
                }];

                const [invoice] = await db.insert(memberInvoices).values({
                    memberId: sub.memberId,
                    locationId: lid,
                    memberPlanId: sid,
                    description: `${sub.pricing.name} - Billing Period`,
                    items: lineItems,
                    subTotal: sub.pricing.price,
                    total: sub.pricing.price,
                    tax: 0,
                    currency: sub.pricing.currency,
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
                    await db.insert(transactions).values({
                        memberId: sub.memberId,
                        locationId: lid,
                        invoiceId: invoice.id,
                        description: `${sub.pricing.name} - Recurring Payment`,
                        type: "inbound",
                        status: "failed",
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

        await db.update(memberSubscriptions).set({
            status: isTrialing ? "trialing" : "active",
            updated: new Date(),
        }).where(eq(memberSubscriptions.id, sid));

        return status(200, {
            status: isTrialing ? "trialing" : "active",
            nextBillingAt: getNextBillingDate(sub),
            scheduledJobKey: `renewal:cash:${sid}`,
        });
    });
}
