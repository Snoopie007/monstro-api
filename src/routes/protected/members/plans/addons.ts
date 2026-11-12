import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { addAddon } from "@/routes/x/loc/addonsBundles/addAddon";
import { getAddonOverview } from "@/routes/x/loc/addonsBundles/subscriptionAddons";
import { memberSubscriptions } from "@/subtrees/schemas";

// Add-ons bill the subscription's saved card, so a cash subscription has nothing to charge.
const CASH_SUBSCRIPTION = "Ask the front desk to add this to a cash subscription";

const MemberPlanParams = t.Object({ mid: t.String(), pid: t.String() });

function getMemberSubscription(mid: string, pid: string) {
    return db.query.memberSubscriptions.findFirst({
        where: and(eq(memberSubscriptions.id, pid), eq(memberSubscriptions.memberId, mid)),
        columns: { locationId: true, paymentType: true },
    });
}

/** A member's add-ons on one subscription, and adding one. */
export function memberPlansAddonRoutes(app: Elysia) {
    return app.get('/addons', async ({ params, status }) => {
        const subscription = await getMemberSubscription(params.mid, params.pid);
        const overview = subscription ? await getAddonOverview(subscription.locationId, params.pid) : null;

        if (!subscription || !overview) return status(404, { error: "Subscription not found" });

        if (subscription.paymentType === "cash") {
            overview.availableAddons = overview.availableAddons.map((addon) => ({
                ...addon, unavailableReason: addon.unavailableReason ?? CASH_SUBSCRIPTION,
            }));
        }

        return status(200, { subscriptionAddons: overview });
    }, {
        params: MemberPlanParams,
    }).post('/addons', async ({ params, body, status }) => {
        const subscription = await getMemberSubscription(params.mid, params.pid);

        if (!subscription) return status(404, { error: "Subscription not found" });

        if (subscription.paymentType === "cash") return status(409, { error: CASH_SUBSCRIPTION });

        const result = await addAddon(subscription.locationId, params.pid, body.addonId);

        if (result.status === "rejected") return status(result.code, { error: result.error });

        // 202: the worker charges the saved card, then activates the add-on.
        return status(result.status === "created" ? 202 : 200, { purchase: result.purchase });
    }, {
        params: MemberPlanParams,
        body: t.Object({ addonId: t.String({ minLength: 1 }) }),
    });
}
