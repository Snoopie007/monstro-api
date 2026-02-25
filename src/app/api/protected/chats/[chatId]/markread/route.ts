import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/db";
import { auth } from "@/libs/auth/server";
import { chatMembers, messages } from "@subtrees/schemas";

type RouteParams = {
  params: Promise<{ chatId: string }>;
};

export async function PATCH(req: Request, props: RouteParams) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { chatId } = await props.params;

  try {
    const body = await req.json();
    const lastMessageId = typeof body?.lastMessageId === "string" ? body.lastMessageId : null;

    if (!lastMessageId) {
      return NextResponse.json({ error: "lastMessageId is required" }, { status: 400 });
    }

    const membership = await db.query.chatMembers.findFirst({
      where: and(
        eq(chatMembers.chatId, chatId),
        eq(chatMembers.userId, session.user.id),
      ),
      columns: {
        chatId: true,
        userId: true,
      },
    });

    if (!membership) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const targetMessage = await db.query.messages.findFirst({
      where: and(
        eq(messages.id, lastMessageId),
        eq(messages.chatId, chatId),
      ),
      columns: {
        id: true,
      },
    });

    if (!targetMessage) {
      return NextResponse.json({ error: "Message not found in this chat" }, { status: 400 });
    }

    await db
      .update(chatMembers)
      .set({
        lastMessageId,
        unreadCount: 0,
      })
      .where(
        and(
          eq(chatMembers.chatId, chatId),
          eq(chatMembers.userId, session.user.id),
        ),
      );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to mark chat as read:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
