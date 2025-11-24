import { db } from "@/db/db";
import { Elysia } from "elysia";
import { eq, sql } from "drizzle-orm";
import { comments, groupPosts } from "@/db/schemas";

type Props = {
    memberId: string
    status: any
}

type GetGroupsParams = Props & {
    params: {
        mid: string
    }
}

type GetGroupParams = Props & {
    params: {
        mid: string
        gid: string
    }
}

export const memberGroups = new Elysia({ prefix: '/groups' })
    .get('/', async ({ params, status }: GetGroupsParams) => {
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
    }).get('/:gid', async ({ params, status }: GetGroupParams) => {
        try {
            const group = await db.query.groups.findFirst({
                where: (groups, { eq }) => eq(groups.id, params.gid),
                with: {
                    location: true,
                    posts: {
                        orderBy: (posts, { desc }) => desc(posts.created),
                        with: {
                            medias: true,
                            user: true,
                        },
                    },
                    groupMembers: {
                        with: {
                            user: true,
                        },
                    },
                },
            });

            if (!group) {
                return status(404, { error: "Group not found" });
            }

            return status(200, group);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch group" });
        }
    })