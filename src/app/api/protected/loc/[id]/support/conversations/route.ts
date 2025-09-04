import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, desc } from "drizzle-orm";
import {
  supportBots,
  supportConversations,
  supportMessages,
} from "@/db/schemas";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get support bot for this location
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json({
        conversations: [],
        message: "No support bot found for this location",
      });
    }

    // Get conversations for this support bot (simplified to avoid relation errors)
    const conversations = await db.query.supportConversations.findMany({
      where: eq(supportConversations.supportBotId, supportBot.id),
      orderBy: [desc(supportConversations.updatedAt)],
      limit: 20,
    });

    // Get member info separately to avoid relation issues
    const conversationsWithMembers = await Promise.all(
      conversations.map(async (conversation) => {
        let member = null;
        if (conversation.memberId) {
          try {
            member = await db.query.members.findFirst({
              where: (m, { eq }) => eq(m.id, conversation.memberId),
              columns: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
              },
            });
          } catch (error) {
            console.error("Error fetching member for conversation:", error);
          }
        }
        return { ...conversation, member };
      })
    );

    // Serialize dates for consistent API response
    const serializedConversations = conversationsWithMembers.map(
      (conversation) => ({
        ...conversation,
        createdAt: conversation.createdAt.toISOString(),
        updatedAt: conversation.updatedAt?.toISOString(),
        takenOverAt: conversation.takenOverAt?.toISOString(),
      })
    );

    return NextResponse.json({
      conversations: serializedConversations,
    });
  } catch (error) {
    console.error("Error fetching conversations:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

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

    const body = await req.json();
    const { memberId, initialMessage } = body;

    if (!memberId) {
      return NextResponse.json(
        { error: "Member ID is required" },
        { status: 400 }
      );
    }

    // Get support bot for this location
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Create new conversation
    const [newConversation] = await db
      .insert(supportConversations)
      .values({
        supportBotId: supportBot.id,
        memberId,
        isVendorActive: false,
        metadata: {
          createdBy: session.user?.id,
          initialContext: initialMessage || "Conversation started by vendor",
        },
      })
      .returning();

    // Create initial system message if provided
    if (initialMessage) {
      await db.insert(supportMessages).values({
        conversationId: newConversation.id,
        content: initialMessage,
        role: "system",
        channel: "System",
        metadata: {
          createdBy: session.user?.id,
        },
      });
    }

    return NextResponse.json({
      conversation: {
        ...newConversation,
        createdAt: newConversation.createdAt.toISOString(),
        updatedAt: newConversation.updatedAt?.toISOString(),
        takenOverAt: newConversation.takenOverAt?.toISOString(),
      },
      message: "Conversation created successfully",
    });
  } catch (error) {
    console.error("Error creating conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
