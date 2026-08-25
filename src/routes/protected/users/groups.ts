import { db } from "@/db/db";
import type { Elysia } from "elysia";
import { sql } from "drizzle-orm";
import { z } from "zod";

const UserGroupsProps = {
    params: z.object({
        uid: z.string(),
    }),
};

export function userGroupsRoutes(app: Elysia) {
    return app.get("/groups", async ({ params, status }) => {
        const { uid } = params;

        try {
            const user = await db.query.users.findFirst({
                where: (u, { eq }) => eq(u.id, uid),
                columns: { id: true },
            });
            if (!user) {
                return status(404, { error: "User not found" });
            }

            const groupMembers = await db.query.groupMembers.findMany({
                where: (a, { eq }) => eq(a.userId, uid),
            });

            const groupIds = [...new Set(groupMembers.map((groupMember) => groupMember.groupId))];
            if (groupIds.length === 0) {
                return status(200, []);
            }

            const groups = await db.query.groups.findMany({
                where: (a, { inArray }) => inArray(a.id, groupIds),
                extras: (t) => ({
                    memberCount: sql<number>`(select count(*) from "group_members" where "group_members"."group_id" = ${t.id})`.as("member_count"),
                    postCount: sql`(select count(*) from "group_posts" where "group_posts"."group_id" = "groups"."id")`.as("post_count"),
                }),
            });
            return status(200, groups);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch groups" });
        }
    }, UserGroupsProps);
}
