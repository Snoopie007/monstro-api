import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportConversations, supportMessages } from "@/db/schemas";

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
    const { reason, urgency } = body;

    // Validate required fields
    if (!reason) {
      return NextResponse.json(
        { error: "Reason for takeover is required" },
        { status: 400 }
      );
    }

    // Find the conversation
    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, params.conversationId),
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Update conversation with vendor takeover
    const [updatedConversation] = await db
      .update(supportConversations)
      .set({
        vendorId: session.user.id,
        isVendorActive: true,
        takenOverAt: new Date(),
        metadata: {
          ...conversation.metadata,
          takeoverReason: reason,
          takeoverUrgency: urgency || "medium",
          takeoverAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      })
      .where(eq(supportConversations.id, params.conversationId))
      .returning();

    // Add system message about takeover
    await db.insert(supportMessages).values({
      conversationId: params.conversationId,
      content: `A support agent has joined the conversation to help with: ${reason}`,
      role: "system",
      channel: "System",
      metadata: {
        takeoverReason: reason,
        takeoverUrgency: urgency || "medium",
        vendorId: session.user.id,
      },
    });

    return NextResponse.json({
      conversation: {
        ...updatedConversation,
        createdAt: updatedConversation.createdAt.toISOString(),
        updatedAt: updatedConversation.updatedAt?.toISOString(),
        takenOverAt: updatedConversation.takenOverAt?.toISOString(),
      },
      message: "Conversation taken over successfully",
    });
  } catch (error) {
    console.error("Error taking over conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; conversationId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the conversation
    const conversation = await db.query.supportConversations.findFirst({
      where: eq(supportConversations.id, params.conversationId),
    });

    if (!conversation) {
      return NextResponse.json(
        { error: "Conversation not found" },
        { status: 404 }
      );
    }

    // Check if user is the one who took over
    if (conversation.vendorId !== session.user.id) {
      return NextResponse.json(
        { error: "Unauthorized - you did not take over this conversation" },
        { status: 403 }
      );
    }

    // Hand back conversation to bot
    const [updatedConversation] = await db
      .update(supportConversations)
      .set({
        isVendorActive: false,
        metadata: {
          ...conversation.metadata,
          handedBackAt: new Date().toISOString(),
          handedBackBy: session.user.id,
        },
        updatedAt: new Date(),
      })
      .where(eq(supportConversations.id, params.conversationId))
      .returning();

    // Add system message about handing back
    await db.insert(supportMessages).values({
      conversationId: params.conversationId,
      content: "The conversation has been handed back to the support bot.",
      role: "system",
      channel: "System",
      metadata: {
        handedBackBy: session.user.id,
        handedBackAt: new Date().toISOString(),
      },
    });

    return NextResponse.json({
      conversation: {
        ...updatedConversation,
        createdAt: updatedConversation.createdAt.toISOString(),
        updatedAt: updatedConversation.updatedAt?.toISOString(),
        takenOverAt: updatedConversation.takenOverAt?.toISOString(),
      },
      message: "Conversation handed back to bot successfully",
    });
  } catch (error) {
    console.error("Error handing back conversation:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
