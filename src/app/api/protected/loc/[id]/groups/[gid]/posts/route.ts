import { eq, desc, inArray } from "drizzle-orm";
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

        // Fetch media separately to avoid circular import issues
        const postIds = posts.map(p => p.id);
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

        // Transform posts to include media in the expected format for UI components
        const transformedPosts = posts.map(post => {
            const postMediaItems = mediaByPostId[post.id] || [];
            return {
                ...post,
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