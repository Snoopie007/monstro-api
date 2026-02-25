import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";

import { db } from "@/db/db";
import { auth } from "@/libs/auth/server";
import { chatMembers, users } from "@subtrees/schemas";

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
    const body = await req.json().catch(() => ({}));
    const hasLastActiveAt = typeof body?.lastActiveAt === "string";
    const parsedLastActiveAt = hasLastActiveAt ? new Date(body.lastActiveAt) : null;
    const isOnline = typeof body?.isOnline === "boolean" ? body.isOnline : null;
    const hasLastSeenAt = typeof body?.lastSeenAt === "string";
    const parsedLastSeenAt = hasLastSeenAt ? new Date(body.lastSeenAt) : null;

    if (parsedLastActiveAt && Number.isNaN(parsedLastActiveAt.getTime())) {
      return NextResponse.json({ error: "Invalid lastActiveAt" }, { status: 400 });
    }

    if (parsedLastSeenAt && Number.isNaN(parsedLastSeenAt.getTime())) {
      return NextResponse.json({ error: "Invalid lastSeenAt" }, { status: 400 });
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

    if (parsedLastActiveAt) {
      await db
        .update(chatMembers)
        .set({
          lastActiveAt: parsedLastActiveAt,
        })
        .where(
          and(
            eq(chatMembers.chatId, chatId),
            eq(chatMembers.userId, session.user.id),
          ),
        );
    }

    if (isOnline !== null) {
      await db
        .update(users)
        .set({
          isOnline,
          ...(isOnline ? {} : { lastSeen: parsedLastSeenAt ?? new Date() }),
        })
        .where(eq(users.id, session.user.id));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update last seen:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
