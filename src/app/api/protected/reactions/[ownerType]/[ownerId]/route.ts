import { sql } from "drizzle-orm";
import { db } from "@/db/db";
import { type EmojiData } from "@/db/schemas";
import { NextResponse } from "next/server";
import { auth } from "@/libs/auth/server";

type RouteParams = {
    params: Promise<{ ownerType: string; ownerId: string }>;
};

// GET: Get aggregated reactions for an entity
export async function GET(req: Request, props: RouteParams) {
    const params = await props.params;
    const { ownerType, ownerId } = params;

    try {
        // Query the reaction_counts view using raw SQL
        const result = await db.execute(sql`
            SELECT 
                owner_type,
                owner_id,
                display,
                name,
                type,
                count,
                user_names,
                user_ids
            FROM reaction_counts
            WHERE owner_type = ${ownerType} AND owner_id = ${ownerId}
        `);

        return NextResponse.json(
            { success: true, reactions: result },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error fetching reactions:", error);
        return NextResponse.json(
            { error: "Failed to fetch reactions" },
            { status: 500 }
        );
    }
}

// POST: Toggle a reaction (add if not exists, remove if exists)
export async function POST(req: Request, props: RouteParams) {
    const params = await props.params;
    const { ownerType, ownerId } = params;

    try {
        const session = await auth();
        if (!session?.user?.id) {
            return NextResponse.json(
                { error: "Unauthorized" },
                { status: 401 }
            );
        }

        const body = await req.json();
        const { emoji } = body as { emoji: EmojiData };

        if (!emoji || !emoji.value || !emoji.name || !emoji.type) {
            return NextResponse.json(
                { error: "Invalid emoji data" },
                { status: 400 }
            );
        }

        // Validate owner type
        if (!["post", "comment", "message"].includes(ownerType)) {
            return NextResponse.json(
                { error: "Invalid owner type" },
                { status: 400 }
            );
        }

        const userId = session.user.id;
        const userName = session.user.name ?? "Unknown";

        // Call the PostgreSQL toggle_reaction function
        const res = await db.execute(
            sql`SELECT toggle_reaction(
                ${userId}, 
                ${ownerType.toLowerCase()}, 
                ${ownerId},
                ${JSON.stringify(emoji)}::jsonb
            ) as added`
        );

        const isAdded = res[0]?.added;

        if (isAdded) {
            const reaction = {
                ownerType,
                ownerId,
                display: emoji.value,
                type: emoji.type,
                name: emoji.name,
                userIds: [userId],
                userNames: [userName],
                created: new Date(),
                count: 1,
            };
            return NextResponse.json({ reaction }, { status: 200 });
        } else {
            return NextResponse.json({ deleted: true }, { status: 200 });
        }
    } catch (error) {
        console.error("Error toggling reaction:", error);
        return NextResponse.json(
            { error: "Failed to toggle reaction" },
            { status: 500 }
        );
    }
}
