import { db } from "@/db/db";
import { Elysia } from "elysia";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import type { ReactionCounts } from "@/types/reactions";
import { reactionCounts } from "@/db/schemas/chat/reactions";

const MemberGroupsProps = {
    params: z.object({
        mid: z.string(),
    }),
};


const MemberGroupProps = {
    params: z.object({
        mid: z.string(),
        gid: z.string(),
    }),
};
export const memberGroups = new Elysia({ prefix: '/groups' })
    .get('/', async ({ params, status }) => {
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
    }, MemberGroupsProps).get('/:gid', async ({ params, status }) => {
        const { gid } = params;
        try {
            const group = await db.query.groups.findFirst({
                where: (groups, { eq }) => eq(groups.id, gid),
                with: {
                    location: true,

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
            const posts = await db.query.groupPosts.findMany({
                where: (groupPosts, { eq }) => eq(groupPosts.groupId, gid),
                with: {
                    medias: true,
                    author: true,
                },
                limit: 50,
                orderBy: (groupPosts, { desc }) => desc(groupPosts.created),
            });

            const postIds = posts.map(p => p.id) || [];

            let reactions: ReactionCounts[] = [];

            if (postIds.length > 0) {
                reactions = await db.select().from(reactionCounts).where(and(
                    eq(reactionCounts.ownerType, 'post'),
                    inArray(reactionCounts.ownerId, postIds)
                ));



                // Add reactions to each message

            }

            // Group reactions by message ID
            const reactionsByPost = reactions.reduce((acc, reaction) => {
                const postId = reaction.ownerId; // Updated field name
                if (!postId) return acc;
                if (!acc[postId]) acc[postId] = [];
                acc[postId].push(reaction);
                return acc;
            }, {} as Record<string, any[]>);
            const postsWithReactions = posts.map(post => ({
                ...post,
                reactions: reactionsByPost[post.id] || []
            }));



            return status(200, {
                ...group,
                posts: postsWithReactions
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch group" });
        }
    }, MemberGroupProps)