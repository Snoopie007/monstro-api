import { db } from "@/db/db";
import { supportConversations, supportMessages } from "@/db/schemas";
import { auth } from "@/libs/auth/server";
import { broadcastSupportMessage, SupportMessagePayload } from "@/libs/server/broadcast";
import { desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

type Params = {
	id: string;
	cid: string;
}

export async function GET(req: NextRequest, props: { params: Promise<Params> }) {
	const params = await props.params;

	try {
		// Get conversation messages
		const messages = await db.query.supportMessages.findMany({
			where: (m, { eq }) => eq(m.conversationId, params.cid),
			orderBy: [desc(supportMessages.created)],
			limit: 20,
		});

		return NextResponse.json(messages, { status: 200 });
	} catch (error) {
		console.error("Error fetching conversation messages:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}

export async function POST(req: NextRequest, props: { params: Promise<Params> }) {
	const params = await props.params;
	const session = await auth();

	console.log('📥 POST /messages - Received request:', { conversationId: params.cid, userId: session?.user?.id });

	if (!session?.user?.id) {
		console.error('❌ Unauthorized request to POST /messages');
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {

		const body = await req.json();
		const { content, role = "staff" } = body;
		console.log('📝 Message content:', { role, contentLength: content?.length });

		if (!content || !content.trim()) {
			return NextResponse.json(
				{ error: "Message content is required" },
				{ status: 400 }
			);
		}

		// Validate role
		if (!["staff", "system"].includes(role)) {
			throw new Error("Invalid role. Must be staff or system");
		}

		// Find the conversation and verify vendor has access
		const conversation = await db.query.supportConversations.findFirst({
			where: eq(supportConversations.id, params.cid),
		});

		if (!conversation) {
			throw new Error("Conversation not found");
		}
		const { agentId } = conversation.metadata as Record<string, any>;
		// Only allow staff messages if vendor has taken over
		// Allow when vendor is active and agentId is not set yet (assistant escalation case)
		if (
			role === "staff" &&
			(!conversation.isVendorActive ||
			 (agentId && agentId !== session.user.id))
		) {
			throw new Error("Unauthorized - you must take over the conversation to send staff messages");
		}

	// Create the message
	console.log('💾 Creating message in database...');
	const [newMessage] = await db
		.insert(supportMessages)
		.values({
			conversationId: params.cid,
			content: content.trim(),
			role,
			channel: "WebChat",
			// Populate agentId and agentName when staff sends message
			agentId: session.user.id,
			agentName: session.user.name,
			metadata: {
				senderId: session.user.id,
				senderName: session.user.name || "Support Agent",
			},
		})
		.returning();

	console.log('✅ Message created:', { messageId: newMessage.id });

	// If agentId is not set in conversation metadata, assign current user as the agent
	if (!agentId && conversation.isVendorActive) {
		console.log('🔧 Assigning agentId to conversation...');
		await db.update(supportConversations).set({
			metadata: {
				...(conversation.metadata as Record<string, any>),
				agentId: session.user.id,
			}
		}).where(eq(supportConversations.id, params.cid));
	}

	// Update conversation timestamp
	console.log('⏰ Updating conversation timestamp...');
	await db.update(supportConversations).set({
		updated: new Date(),
	}).where(eq(supportConversations.id, params.cid));

	// Broadcast the message to Supabase Realtime (for dashboard)
	try {
		console.log('📡 Preparing broadcast payload...');
		const messagePayload: SupportMessagePayload = {
			id: newMessage.id,
			conversationId: newMessage.conversationId,
			content: newMessage.content,
			role: newMessage.role,
			channel: newMessage.channel,
			agentId: newMessage.agentId,
			agentName: newMessage.agentName,
			metadata: newMessage.metadata || {},
			created: newMessage.created,
		};
		console.log('🚀 Calling broadcastSupportMessage...');
		await broadcastSupportMessage(params.cid, messagePayload);
		console.log('✅ Broadcast completed successfully');
	} catch (broadcastError) {
		console.error("❌ Failed to broadcast staff message:", broadcastError);
		// Don't fail the request if broadcast fails
	}

	console.log('📤 Returning message response:', { messageId: newMessage.id });
	return NextResponse.json(newMessage, { status: 200 });
	} catch (error) {
		console.error("Error sending staff message:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });

	}
}
