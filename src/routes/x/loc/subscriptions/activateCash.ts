import { getDeferredBilling } from "@/subtrees/utils/deferredBilling";
import { scheduleCashRenewal } from "@/queues/subscriptions";
import { getSubscriptionBillingQuote } from "@/subtrees/utils/subscriptionBilling";
import { db } from "@/db/db";
import { memberLocations, memberSubscriptions } from "@/subtrees/schemas";
import type Elysia from "elysia";
import { and, eq } from "drizzle-orm";
import { getNextBillingDate } from "./shared";
import {
    activateCashSubscription,
    findCashSubscriptions,
    hasCashBillingDefinition,
    planCashActivation,
} from "./cashActivation";

export async function activateCashSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/activate-cash", async ({ params, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };

        const [sub] = await findCashSubscriptions(db, and(
            eq(memberSubscriptions.id, sid),
            eq(memberSubscriptions.locationId, lid),
        ));

        if (!sub || !hasCashBillingDefinition(sub)) {
            return status(404, { error: "Subscription billing definition not found" });
        }
        if (sub.parentId) {
            return status(400, { error: "Only root subscriptions can be activated", code: "SUBSCRIPTION_CHILD" });
        }

        const deferred = getDeferredBilling(sub.metadata);
        if (deferred) {
            if (!["incomplete", "active"].includes(sub.status)) return status(409, { error: "This subscription cannot be activated" });
            if (sub.status === "incomplete" && new Date(sub.currentPeriodEnd).getTime() <= Date.now()) return status(409, { error: "The first payment date has passed. Create a new enrollment.", code: "FIRST_PAYMENT_DATE_PASSED" });
            const pricing = getSubscriptionBillingQuote(sub);
            const due = new Date(sub.currentPeriodEnd);
            await db.transaction(async tx => {
                await tx.update(memberSubscriptions).set({ status: "active", updated: new Date() }).where(eq(memberSubscriptions.id, sid));
                await tx.update(memberLocations).set({ status: "active", updated: new Date() }).where(and(
                    eq(memberLocations.memberId, sub.memberId), eq(memberLocations.locationId, lid)));
                await scheduleCashRenewal(due, {
                    sid, lid, pricing, vendorId: sub.location.vendorId,
                    member: sub.member, location: sub.location,
                    taxRate: sub.location.taxRates.find(rate => rate.isDefault)?.percentage ?? 0,
                });
            });
            return status(200, { status: "active", nextBillingAt: due, scheduledJobKey: `cashInvoiceDue_${sid}_${due.getTime()}` });
        }

        const activation = await planCashActivation(sub, lid);
        await db.transaction(tx => activateCashSubscription(tx, sub, lid, activation));

        return status(200, {
            status: activation.status,
            nextBillingAt: getNextBillingDate(sub),
            scheduledJobKey: null,
        });
    });
}
