import { db } from "@/db/db";
import { supportConversations, supportMessages } from "@subtrees/schemas";
import { auth } from "@/libs/auth/server";
import {
  broadcastSupportConversation,
  broadcastSupportMessage,
  SupportConversationPayload,
  SupportMessagePayload
} from "@/libs/server/broadcast";
import { SupportMessage } from "@subtrees/types/support";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function POST(
	req: NextRequest,
	props: { params: Promise<{ id: string; cid: string }> }
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
			where: eq(supportConversations.id, params.cid),
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
				isVendorActive: true,
				metadata: {
					...(conversation.metadata as object || {}),
					agentId: session.user.id,
					takeoverReason: reason,
					takeoverUrgency: urgency || "medium",
					takenOverAt: new Date().toISOString(),
				},
				updated: new Date(),
			})
			.where(eq(supportConversations.id, params.cid))
			.returning();


			const systemMessage: SupportMessage = {
				id: `system-${Date.now()}`,
				conversationId: params.cid,
				content: `${session.user.name} has joined the conversation`,
				role: 'system' as const,
				channel: 'System',
				agentName: session.user.name,
				agentId: session.user.id,
				metadata: {},
				created: new Date(),
			}
			
			await db.insert(supportMessages).values([systemMessage]);

		// Broadcast conversation update
		try {
			const conversationPayload: SupportConversationPayload = {
				id: updatedConversation.id,
				supportAssistantId: updatedConversation.supportAssistantId,
				locationId: updatedConversation.locationId,
				memberId: updatedConversation.memberId,
				category: updatedConversation.category,
				isVendorActive: updatedConversation.isVendorActive ?? true,
				status: updatedConversation.status,
				title: updatedConversation.title,
				metadata: updatedConversation.metadata || {},
				created: updatedConversation.created,
				updated: updatedConversation.updated,
				takenOverAt: updatedConversation.takenOverAt,
				description: updatedConversation.description,
				priority: updatedConversation.priority,
			};
			await broadcastSupportConversation(params.id, conversationPayload, 'conversation_updated');
		} catch (broadcastError) {
			console.error("Failed to broadcast conversation update:", broadcastError);
		}

		// Broadcast system message
		try {
			const messagePayload: SupportMessagePayload = {
				id: systemMessage.id,
				conversationId: systemMessage.conversationId,
				content: systemMessage.content,
				role: systemMessage.role,
				channel: systemMessage.channel,
				agentId: systemMessage.agentId,
				agentName: systemMessage.agentName,
				metadata: systemMessage.metadata || {},
				created: systemMessage.created,
			};
			await broadcastSupportMessage(params.cid, messagePayload);
		} catch (broadcastError) {
			console.error("Failed to broadcast system message:", broadcastError);
		}

		return NextResponse.json(updatedConversation, { status: 200 });
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
	props: { params: Promise<{ id: string; cid: string }> }
) {
	const params = await props.params;

	try {
		const session = await auth();

		if (!session?.user?.id) {
			return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
		}

		// Find the conversation
		const conversation = await db.query.supportConversations.findFirst({
			where: eq(supportConversations.id, params.cid),
		});

		if (!conversation) {
			return NextResponse.json(
				{ error: "Conversation not found" },
				{ status: 404 }
			);
		}

		// Check if user is the one who took over
		const { agentId } = conversation.metadata as Record<string, any>;
		if (!conversation.isVendorActive || agentId !== session.user.id) {
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
					...(conversation.metadata as object || {}),
					handedBackAt: new Date().toISOString(),
					handedBackBy: session.user.id,
				},
				updated: new Date(),
			})
			.where(eq(supportConversations.id, params.cid))
			.returning();

		// Broadcast conversation update for hand-back
		try {
			const conversationPayload: SupportConversationPayload = {
				id: updatedConversation.id,
				supportAssistantId: updatedConversation.supportAssistantId,
				locationId: updatedConversation.locationId,
				memberId: updatedConversation.memberId,
				category: updatedConversation.category,
				isVendorActive: updatedConversation.isVendorActive ?? false,
				status: updatedConversation.status,
				title: updatedConversation.title,
				metadata: updatedConversation.metadata || {},
				created: updatedConversation.created,
				updated: updatedConversation.updated,
				takenOverAt: updatedConversation.takenOverAt,
				description: updatedConversation.description,
				priority: updatedConversation.priority,
			};
			await broadcastSupportConversation(params.id, conversationPayload, 'conversation_updated');
		} catch (broadcastError) {
			console.error("Failed to broadcast hand-back update:", broadcastError);
		}

		return NextResponse.json({ success: "Conversation handed back to bot successfully" }, { status: 200 });
	} catch (error) {
		console.error("Error handing back conversation:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
