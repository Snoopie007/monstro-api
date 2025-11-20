import { db } from "@/db/db";
import type { Elysia } from "elysia";
import { sql } from "drizzle-orm";

type Props = {
    memberId: string
    status: any
}

type GetParams = Props & {
    params: {
        mid: string
    }
}

export function memberGroups(app: Elysia) {
    return app.get('/groups', async ({ params, status }: GetParams) => {
        const { mid } = params;

        try {
            const member = await db.query.members.findFirst({
                where: (a, { eq }) => eq(a.id, mid),
            });
            if (!member) {
                return status(404, { error: "Member not found" });
            }
            const groupMembers = await db.query.groupMembers.findMany({
                where: (a, { eq }) => eq(a.userId, member.userId),
            });

            const groupIds = [...new Set(groupMembers.map((groupMember) => groupMember.groupId))];
            const groups = await db.query.groups.findMany({
                where: (a, { inArray }) => inArray(a.id, groupIds),
                extras: (t) => ({
                    memberCount: sql<number>`(select count(*) from "group_members" where "group_members"."group_id" = ${t.id})`.as('member_count'),
                    postCount: sql`(select count(*) from "group_posts" where "group_posts"."group_id" = "groups"."id")`.as('post_count'),
                })
            });
            return status(200, groups);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch groups" });
        }
    })
}