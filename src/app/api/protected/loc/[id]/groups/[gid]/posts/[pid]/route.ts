import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@/db/db";
import { groupPosts, comments } from "@/db/schemas";
import { NextResponse } from "next/server";

type RouteParams = {
    params: Promise<{ id: string; gid: string; pid: string }>;
};

// GET: Fetch single post with user and top-level comments
export async function GET(req: Request, props: RouteParams) {
    const params = await props.params;
    const { pid } = params;

    try {
        // Fetch the post with user info
        const post = await db.query.groupPosts.findFirst({
            where: eq(groupPosts.id, pid),
            with: {
                user: true,
            },
        });

        if (!post) {
            return NextResponse.json(
                { error: "Post not found" },
                { status: 404 }
            );
        }

        // Fetch top-level comments (parentId is null, not deleted)
        const postComments = await db.query.comments.findMany({
            where: and(
                eq(comments.ownerType, "post"),
                eq(comments.ownerId, pid),
                isNull(comments.parentId),
                isNull(comments.deletedOn)
            ),
            orderBy: [desc(comments.pinned), desc(comments.created)],
            with: {
                user: true,
            },
        });

        return NextResponse.json(
            { success: true, post, comments: postComments },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching post:", error);
        return NextResponse.json(
            { error: "Failed to fetch post" },
            { status: 500 }
        );
    }
}
