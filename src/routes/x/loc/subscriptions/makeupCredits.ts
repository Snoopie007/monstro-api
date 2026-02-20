import { db } from "@/db/db";
import type Elysia from "elysia";

export async function subscriptionMakeupCreditsRoutes(app: Elysia) {
    return app.get("/:sid/makeup-credits", async ({ params, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const subscription = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
            with: {
                pricing: {
                    with: {
                        plan: true,
                    },
                },
            },
        });

        if (!subscription) {
            return status(404, { error: "Subscription not found" });
        }

        const limit = subscription.pricing?.plan?.makeUpCredits ?? 0;
        const used = subscription.makeUpCredits;

        return status(200, {
            used,
            remaining: Math.max(0, limit - used),
            limit,
            allowCarryOver: subscription.allowMakeUpCarryOver,
        });
    });
}
