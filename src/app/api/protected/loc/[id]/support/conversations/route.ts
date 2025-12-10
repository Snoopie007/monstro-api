import { db } from "@/db/db";
import {
  supportAssistants,
  supportConversations,
  supportMessages,
} from "@/db/schemas";
import { auth } from "@/libs/auth/server";
import {
  broadcastSupportConversation,
  broadcastSupportMessage,
  SupportConversationPayload,
  SupportMessagePayload
} from "@/libs/server/broadcast";
import { eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;

	try {

		// Get support assistant for this location
		const assistant = await db.query.supportAssistants.findFirst({
			where: eq(supportAssistants.locationId, params.id),
			with: {
				conversations: {
					orderBy: (conversations, { desc }) => [desc(conversations.created)],
				},
			},
		});

		if (!assistant) {
			return NextResponse.json({
				conversations: [],
				message: "No support assistant found for this location",
			});
		}



		return NextResponse.json(assistant, { status: 200 });
	} catch (error) {
		console.error("Error fetching conversations:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: string }> }) {
	const params = await props.params;
	const session = await auth();
	const { memberId, initialMessage, category = "General", title } = await req.json();
	try {



		if (!memberId) {
			return NextResponse.json(
				{ error: "Member ID is required" },
				{ status: 400 }
			);
		}

		// Get support assistant for this location
		const supportAssistant = await db.query.supportAssistants.findFirst({
			where: eq(supportAssistants.locationId, params.id),
		});

		if (!supportAssistant) {
			return NextResponse.json(
				{ error: "Support assistant not found for this location" },
				{ status: 404 }
			);
		}

		// Create new conversation
		const [newConversation] = await db
			.insert(supportConversations)
			.values({
				supportAssistantId: supportAssistant.id,
				locationId: params.id,
				memberId,
				category,
				title,
				isVendorActive: false,
				metadata: {
					createdBy: memberId,
					initialContext: initialMessage || "Conversation started by vendor",
				},
			})
			.returning();

		// Broadcast new conversation to Supabase Realtime
		try {
			const conversationPayload: SupportConversationPayload = {
				id: newConversation.id,
				supportAssistantId: newConversation.supportAssistantId,
				locationId: newConversation.locationId,
				memberId: newConversation.memberId,
				category: newConversation.category,
				isVendorActive: newConversation.isVendorActive ?? false,
				status: newConversation.status,
				title: newConversation.title,
				metadata: newConversation.metadata || {},
				created: newConversation.created,
				updated: newConversation.updated,
				takenOverAt: newConversation.takenOverAt,
				description: newConversation.description,
				priority: newConversation.priority,
			};
			await broadcastSupportConversation(params.id, conversationPayload, 'conversation_inserted');
		} catch (broadcastError) {
			console.error("Failed to broadcast new conversation:", broadcastError);
		}

		// Create initial system message if provided
		if (initialMessage) {
			const [systemMessage] = await db.insert(supportMessages).values({
				conversationId: newConversation.id,
				content: initialMessage,
				role: 'system',
				channel: 'WebChat',
				metadata: {
					createdBy: session?.user?.id,
				},
			}).returning();

			// Broadcast initial system message
			if (systemMessage) {
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
					await broadcastSupportMessage(newConversation.id, messagePayload);
				} catch (broadcastError) {
					console.error("Failed to broadcast initial message:", broadcastError);
				}
			}
		}

		return NextResponse.json(newConversation, { status: 200 });
	} catch (error) {
		console.error("Error creating conversation:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
