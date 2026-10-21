import { getDeferredBilling } from "@/subtrees/utils/deferredBilling";
import { db } from "@/db/db";
import { removeRenewalJobs } from "@/queues/subscriptions";
import { memberSubscriptions } from "@/subtrees/schemas";
import type Elysia from "elysia";
import { eq } from "drizzle-orm";
import { hasLocationPermissions } from "@/utils/locationAccess";

export async function pauseSubscriptionRoutes(app: Elysia) {
    return app.post("/:sid/pause", async (ctx) => {
        const { params, status } = ctx;
        const { lid, sid } = params as { lid: string; sid: string };
        if (!await hasLocationPermissions(lid, ctx, ["manage billing"])) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
        const sub = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid)),
        });

        if (!sub) {
            return status(404, { error: "Subscription not found" });
        }
        if (sub.parentId) {
            return status(400, { error: "Pause the root subscription to pause participant access", code: "SUBSCRIPTION_CHILD" });
        }

        if (sub.status === "paused") return status(200, { status: "paused", scheduler: { paused: true } });
        const deferred = getDeferredBilling(sub.metadata);
        const now = new Date();
        await db.transaction(async (tx) => {
            await tx.update(memberSubscriptions).set({
                status: "paused",
                ...(deferred ? { metadata: {
                    ...sub.metadata,
                    deferredBilling: { ...deferred, pausedAt: now.toISOString() },
                } } : {}),
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
