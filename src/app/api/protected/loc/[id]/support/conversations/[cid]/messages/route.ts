import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and, desc } from "drizzle-orm";
import { supportConversations, supportMessages } from "@/db/schemas";

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

	if (!session?.user?.id) {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

	try {

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
		if (
			role === "staff" &&
			(!conversation.isVendorActive || agentId !== session.user.id)
		) {
			throw new Error("Unauthorized - you must take over the conversation to send staff messages");
		}

		// Create the message
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

		// Update conversation timestamp
		await db.update(supportConversations).set({
			updated: new Date(),
		}).where(eq(supportConversations.id, params.cid));

		return NextResponse.json(newMessage, { status: 200 });
	} catch (error) {
		console.error("Error sending staff message:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });

	}
}
