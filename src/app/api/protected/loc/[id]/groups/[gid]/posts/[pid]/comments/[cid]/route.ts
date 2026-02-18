import { eq, and, isNull, desc } from "drizzle-orm";
import { db } from "@/db/db";
import { comments } from "@subtrees/schemas";
import { NextResponse } from "next/server";
import { auth } from "@/libs/auth/server";

type RouteParams = {
    params: Promise<{ id: string; gid: string; pid: string; cid: string }>;
};

// GET: Fetch a single comment with nested replies
export async function GET(req: Request, props: RouteParams) {
    const params = await props.params;
    const { cid } = params;

    try {
        const comment = await db.query.comments.findFirst({
            where: and(
                eq(comments.id, cid),
                isNull(comments.deletedOn)
            ),
            with: {
                user: true,
                replies: {
                    where: isNull(comments.deletedOn),
                    orderBy: [desc(comments.created)],
                    with: {
                        user: true,
                        replies: {
                            where: isNull(comments.deletedOn),
                            orderBy: [desc(comments.created)],
                            with: {
                                user: true,
                            },
                        },
                    },
                },
            },
        });

        if (!comment) {
            return NextResponse.json(
                { error: "Comment not found" },
                { status: 404 }
            );
        }

        return NextResponse.json(
            { success: true, comment },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching comment:", error);
        return NextResponse.json(
            { error: "Failed to fetch comment" },
            { status: 500 }
        );
    }
}

// DELETE: Soft delete a comment
export async function DELETE(req: Request, props: RouteParams) {
    const params = await props.params;
    const { cid } = params;

    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        // Check if comment exists and belongs to user
        const existingComment = await db.query.comments.findFirst({
            where: and(
                eq(comments.id, cid),
                isNull(comments.deletedOn)
            ),
        });

        if (!existingComment) {
            return NextResponse.json(
                { error: "Comment not found" },
                { status: 404 }
            );
        }

        // Only allow owner to delete (or admin, but keeping simple for now)
        if (existingComment.userId !== session.user.id) {
            return NextResponse.json(
                { error: "Not authorized to delete this comment" },
                { status: 403 }
            );
        }

        // Soft delete
        await db
            .update(comments)
            .set({ deletedOn: new Date() })
            .where(eq(comments.id, cid));

        return NextResponse.json(
            { success: true, message: "Comment deleted" },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error deleting comment:", error);
        return NextResponse.json(
            { error: "Failed to delete comment" },
            { status: 500 }
        );
    }
}
