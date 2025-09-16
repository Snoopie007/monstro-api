import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportConversations, supportMessages } from "@/db/schemas";

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

		// Add system message about takeover
		await db.insert(supportMessages).values({
			conversationId: params.cid,
			content: `A support agent has joined the conversation to help with: ${reason}`,
			role: "system",
			channel: "WebChat",
			// Populate agentId and agentName for takeover system message
			agentId: session.user.id,
			agentName: session.user.name || "Support Agent",
			metadata: {
				takeoverReason: reason,
				takeoverUrgency: urgency || "medium",
				agentId: session.user.id,
			},
		});

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

		// Add system message about handing back
		await db.insert(supportMessages).values({
			conversationId: params.cid,
			content: "The conversation has been handed back to the support bot.",
			role: "system",
			channel: "WebChat",
			// Populate agentId and agentName for handback system message
			agentId: session.user.id,
			agentName: session.user.name || "Support Agent",
			metadata: {
				handedBackBy: session.user.id,
				handedBackAt: new Date().toISOString(),
			},
		});

		return NextResponse.json({ success: "Conversation handed back to bot successfully" }, { status: 200 });
	} catch (error) {
		console.error("Error handing back conversation:", error);
		return NextResponse.json(
			{ error: "Internal server error" },
			{ status: 500 }
		);
	}
}
