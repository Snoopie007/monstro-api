import { eq, desc, inArray, sql } from "drizzle-orm";
import { db } from "@/db/db";
import { groupPosts, media } from "@/db/schemas";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string, gid: string }> }) {
    const params = await props.params;
    const { gid } = params;

    try {
        const posts = await db.query.groupPosts.findMany({
            where: eq(groupPosts.groupId, gid),
            orderBy: [desc(groupPosts.pinned), desc(groupPosts.created)],
            columns: {
                id: true,
                title: true,
                content: true,
                pinned: true,
                status: true,
                metadata: true,
                created: true,
                groupId: true,
                comments: true,
            },
            with: {
                user: {
                    columns: {
                        id: true,
                        name: true,
                        image: true,
                    },
                },
            },
        });

        const postIds = posts.map(p => p.id);

        // Batch fetch reactions from reaction_counts view
        const reactions = postIds.length > 0
            ? await db.execute(sql`
                SELECT owner_id, display, name, type, count, user_names, user_ids
                FROM reaction_counts
                WHERE owner_type = 'post' AND owner_id = ANY(ARRAY[${sql.join(postIds.map(id => sql`${id}`), sql`, `)}])
            `)
            : [];

        // Group reactions by post ID
        const reactionsByPost = (reactions as any[]).reduce((acc, reaction) => {
            const postId = reaction.owner_id;
            if (!acc[postId]) acc[postId] = [];
            acc[postId].push({
                display: reaction.display,
                name: reaction.name,
                type: reaction.type,
                count: reaction.count,
                userNames: reaction.user_names,
                userIds: reaction.user_ids,
            });
            return acc;
        }, {} as Record<string, any[]>);

        // Fetch media separately to avoid circular import issues
        const postMedia = postIds.length > 0 
            ? await db.select({
                id: media.id,
                url: media.url,
                fileType: media.fileType,
                fileName: media.fileName,
                ownerId: media.ownerId,
            })
            .from(media)
            .where(inArray(media.ownerId, postIds))
            : [];

        // Group media by post ID
        const mediaByPostId = postMedia.reduce((acc, m) => {
            if (!acc[m.ownerId]) acc[m.ownerId] = [];
            acc[m.ownerId].push(m);
            return acc;
        }, {} as Record<string, typeof postMedia>);

        // Transform posts to include media and reactions
        const transformedPosts = posts.map(post => {
            const postMediaItems = mediaByPostId[post.id] || [];
            return {
                ...post,
                reactions: reactionsByPost[post.id] || [],
                media: postMediaItems,
                metadata: {
                    ...post.metadata,
                    mediaUrl: postMediaItems[0]?.url || null,
                    attachments: postMediaItems.map(m => ({
                        id: m.id,
                        url: m.url,
                        type: m.fileType,
                    })),
                },
            };
        });

        return NextResponse.json({ success: true, posts: transformedPosts }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: error }, { status: 500 });
    }
}
