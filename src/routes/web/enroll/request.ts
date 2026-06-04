import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { memberLocations } from "@subtrees/schemas";
import { db } from "@/db/db";
const EnrollRequestBody = t.Object({
    priceId: t.String(),
    message: t.Optional(t.String()),
});

export const webEnrollRequestRoutes = new Elysia({ prefix: "/enroll" })
    .use(WebAuthMiddleware)
    .post("/request", async ({ status, lid, session, body }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "Unauthorized" });
        }

        const mid = session.user.memberId;

        try {

            await db.insert(memberLocations).values({
                memberId: mid,
                locationId: lid,
                status: "incomplete",
            }).onConflictDoNothing({
                target: [memberLocations.memberId, memberLocations.locationId],
            });
            // Notify request
            return status(200, {});
        } catch (error) {
            return status(500, { message: "Internal server error" });
        }
    }, { body: EnrollRequestBody });
