import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/libs/auth/server";
import { db } from "@/db/db";
import { groups, groupMembers, chats, chatMembers } from "@/db/schemas";
import S3Bucket from "@/libs/server/s3";

export async function POST(
    req: NextRequest,
    props: { params: Promise<{ id: string }> }
) {
    const params = await props.params;
    try {
        const session = await auth();
        if (!session) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const formData = await req.formData();
        const name = formData.get("name") as string;
        const handle = formData.get("handle") as string;
        const description = formData.get("description") as string;
        const type = formData.get("type") as "public" | "private";
        const coverImage = formData.get("coverImage") as File | null;

        if (!name || !handle) {
            return NextResponse.json(
                { error: "Name and handle are required" },
                { status: 400 }
            );
        }

        let coverImageUrl: string | null = null;

        if (coverImage && coverImage instanceof Blob && coverImage.size > 0) {
            const s3 = new S3Bucket();
            const uploadResult = await s3.uploadFile(
                coverImage,
                `groups/${params.id}`
            );
            coverImageUrl = uploadResult.url;
        }

        const result = await db.transaction(async (tx) => {
            const [newGroup] = await tx
                .insert(groups)
                .values({
                    name,
                    handle,
                    description,
                    type,
                    locationId: params.id,
                    coverImage: coverImageUrl,
                })
                .returning();

            await tx.insert(groupMembers).values({
                groupId: newGroup.id,
                userId: session.user.id,
                role: "owner",
            });

            const [newChat] = await tx
                .insert(chats)
                .values({
                    name: name,
                    groupId: newGroup.id,
                    startedBy: session.user.id,
                })
                .returning();

            await tx.insert(chatMembers).values({
                chatId: newChat.id,
                userId: session.user.id,
            });

            return { group: newGroup, chat: newChat };
        });

        return NextResponse.json(result);
    } catch (error: any) {
        console.error("Error creating group:", error);
        if (error.code === '23505') { // Unique violation
            return NextResponse.json(
                { error: "Handle already exists" },
                { status: 409 }
            );
        }
        return NextResponse.json(
            { error: error.message || "Internal Server Error" },
            { status: 500 }
        );
    }
}
