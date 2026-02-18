import { db } from "@/db/db";
import { Elysia } from "elysia";
import { z } from "zod";
import type { ReactionCount } from "@subtrees/types/";
import { reactionCounts } from "@subtrees/schemas";
import { and, eq, inArray } from "drizzle-orm";

const GetGroupProps = {
    params: z.object({
        gid: z.string(),
    }),
};



export const groupRoutes = new Elysia({ prefix: 'groups' })
    .group('/:gid', (app) => {
        app.get('/', async ({ params, status }) => {
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

                let reactions: ReactionCount[] = [];

                if (postIds.length > 0) {
                    reactions = await db.select().from(reactionCounts).where(and(
                        eq(reactionCounts.ownerType, 'post'),
                        inArray(reactionCounts.ownerId, postIds)
                    ));
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
        }, GetGroupProps)
        return app;
    })