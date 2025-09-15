import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and, desc } from "drizzle-orm";
import { supportConversations, supportMessages } from "@/db/schemas";
import { Channel } from "@/db/schemas/support/SupportBotEnums";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; conversationId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get conversation messages
    const messages = await db.query.supportMessages.findMany({
      where: eq(supportMessages.conversationId, params.conversationId),
      orderBy: [desc(supportMessages.createdAt)],
      limit: 50,
    });

    // Serialize dates for consistent API response
    const serializedMessages = messages.map((message) => ({
      ...message,
      createdAt: message.createdAt.toISOString(),
    }));

    return NextResponse.json({
      messages: serializedMessages.reverse(), // Return in chronological order
    });
  } catch (error) {
    console.error("Error fetching conversation messages:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  props: { params: Promise<{ id: string; conversationId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { content, role = "staff" } = body;

    if (!content || !content.trim()) {
      return NextResponse.json(
        { error: "Message content is required" },
        { status: 400 }
      );
    }

    // Validate role
    if (!["staff", "system"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role. Must be staff or system" },
        { status: 400 }
      );
    }

    // Find the conversation and verify vendor has access
    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, params.conversationId),
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }
    const { agentId } = conversation.metadata as Record<string, any>;
    // Only allow staff messages if vendor has taken over
    if (
      role === "staff" &&
      (!conversation.isVendorActive || agentId !== session.user.id)
    ) {
      return NextResponse.json(
        {
          error:
            "Unauthorized - you must take over the conversation to send staff messages",
        },
        { status: 403 }
      );
    }

    // Create the message
    const [newMessage] = await db
      .insert(supportMessages)
      .values({
        conversationId: params.conversationId,
        content: content.trim(),
        role,
        channel: Channel.WebChat,
        // Populate agentId and agentName when staff sends message
        agentId: session.user.id,
        agentName: session.user.name,
        metadata: {
          senderId: session.user.id,
          senderName: session.user.name || "Support Agent",
        },
      })
      .returning();

    // Update conversation timestamp
    await db
      .update(supportConversations)
      .set({
        updatedAt: new Date(),
      })
      .where(eq(supportConversations.id, params.conversationId));

    return NextResponse.json({
      message: {
        ...newMessage,
        createdAt: newMessage.createdAt.toISOString(),
      },
      success: "Message sent successfully",
    });
  } catch (error) {
    console.error("Error sending staff message:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
