import { db } from "@/db/db";
import { removeRenewalJobs } from "@/queues/subscriptions";
import { memberSubscriptions } from "@subtrees/schemas";
import type Elysia from "elysia";
import { eq } from "drizzle-orm";

export async function pauseSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/pause", async ({ params, status }) => {
        const { lid, sid } = params as { lid: string; sid: string };
        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
        });

        if (!sub) {
            return status(404, { error: "Subscription not found" });
        }
        if (sub.parentId) {
            return status(400, { error: "Pause the root subscription to pause participant access", code: "SUBSCRIPTION_CHILD" });
        }

        await db.transaction(async (tx) => {
            await tx.update(memberSubscriptions).set({
                status: "paused",
                updated: new Date(),
            }).where(eq(memberSubscriptions.id, sid));
            await tx.update(memberSubscriptions).set({
                status: "paused",
                updated: new Date(),
            }).where(eq(memberSubscriptions.parentId, sid));
        });

        await removeRenewalJobs(sid);

        return status(200, {
            status: "paused",
            scheduler: { paused: true },
        });
    });
}
