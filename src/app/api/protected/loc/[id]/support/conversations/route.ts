import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, desc } from "drizzle-orm";
import {
	supportAssistants,
	supportConversations,
	supportMessages,
} from "@/db/schemas";

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

		// Create initial system message if provided
		if (initialMessage) {
			await db.insert(supportMessages).values({
				conversationId: newConversation.id,
				content: initialMessage,
				role: 'system',
				channel: 'WebChat',
				metadata: {
					createdBy: session?.user?.id,
				},
			});
		}

		return NextResponse.json(newConversation, { status: 200 });
	} catch (error) {
		console.error("Error creating conversation:", error);
		return NextResponse.json({ error: "Internal server error" }, { status: 500 });
	}
}
