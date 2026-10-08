import { Elysia, t } from "elysia";
import { db } from "@/db/db";

export const slMemberRoutes = new Elysia({ prefix: "/members" })
    .get("/", async ({ params, status }) => {
        const { lid } = params;
        try {
            const mls = await db.query.memberLocations.findMany({
                where: (ml, { eq }) => eq(ml.locationId, lid),
                with: {
                    member: true,
                },
                orderBy: (ml, { desc }) => desc(ml.created),
            });
            return status(200, mls);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
            staffId: t.Optional(t.String()),
        }),
    })
    .get("/:memberId", async ({ params, status }) => {
        const { lid, memberId } = params;
        try {
            const member = await db.query.memberLocations.findFirst({
                where: (ml, { and, eq }) => and(
                    eq(ml.locationId, lid),
                    eq(ml.memberId, memberId),
                ),
                with: {
                    member: true,
                },
            });
            if (!member) {
                return status(404, { error: "Member not found" });
            }
            return status(200, member);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal server error" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
            memberId: t.String(),
            staffId: t.Optional(t.String()),
        }),
    });
