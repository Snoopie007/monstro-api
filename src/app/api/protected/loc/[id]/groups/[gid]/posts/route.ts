import { eq } from "drizzle-orm";
import { db } from "@/db/db";
import { groupPosts } from "@/db/schemas";
import { NextResponse } from "next/server";

export async function GET(req: Request, props: { params: Promise<{ id: string, gid: string }> }) {
    const params = await props.params;
    const { gid } = params;

    try {
        const posts = await db.query.groupPosts.findMany({
        where: eq(groupPosts.groupId, gid),
        with: {
            user: true,
        },
    });

    return NextResponse.json({ success: true, posts }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ error: error }, { status: 500 });
    }
}