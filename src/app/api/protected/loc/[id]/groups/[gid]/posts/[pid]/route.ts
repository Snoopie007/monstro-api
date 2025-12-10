import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@/db/db";
import { groupPosts, comments, staffLocations, staffs } from "@/db/schemas";
import { NextResponse } from "next/server";
import { auth } from "@/libs/auth/server";

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

// DELETE: Delete a post (post owner or staff can delete)
export async function DELETE(req: Request, props: RouteParams) {
    const params = await props.params;
    const { id: locationId, pid } = params;

    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Find the post
        const post = await db.query.groupPosts.findFirst({
            where: eq(groupPosts.id, pid),
        });

        if (!post) {
            return NextResponse.json(
                { error: "Post not found" },
                { status: 404 }
            );
        }

        // Check if user is the post owner
        const isOwner = post.authorId === session.user.id;

        // Check if user is a staff member at this location
        // First find the staff record for this user
        const staff = await db.query.staffs.findFirst({
            where: eq(staffs.userId, session.user.id),
        });
        
        let isStaff = false;
        if (staff) {
            // Then check if they have access to this location
            const staffLocation = await db.query.staffLocations.findFirst({
                where: and(
                    eq(staffLocations.staffId, staff.id),
                    eq(staffLocations.locationId, locationId)
                ),
            });
            isStaff = !!staffLocation;
        }

        // Only allow owner or staff to delete
        if (!isOwner && !isStaff) {
            return NextResponse.json(
                { error: "Not authorized to delete this post" },
                { status: 403 }
            );
        }

        // Delete the post (cascade will handle related comments, media, reactions)
        await db.delete(groupPosts).where(eq(groupPosts.id, pid));

        return NextResponse.json(
            { success: true, message: "Post deleted" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting post:", error);
        return NextResponse.json(
            { error: "Failed to delete post" },
            { status: 500 }
        );
    }
}
