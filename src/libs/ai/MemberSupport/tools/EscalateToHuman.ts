import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportConversations } from "@subtrees/schemas";
import type { SupportConversation } from "@subtrees/types";
import { broadcastSupportConversation, formatSupportConversationPayload } from "@/libs/broadcast";
import type { Context, ToolCall } from "./types";

export async function EscalateToHuman(toolCall: ToolCall, context: Context): Promise<string> {
	const { args } = toolCall;
	void args;

	try {
		const [updatedConversation] = await db.update(supportConversations).set({
			isVendorActive: true,
			updated: new Date(),
		}).where(eq(supportConversations.id, context.conversation.id)).returning();

		if (updatedConversation) {
			try {
				await broadcastSupportConversation(
					updatedConversation.locationId,
					formatSupportConversationPayload(updatedConversation as SupportConversation),
					"conversation_updated",
				);
			} catch (broadcastError) {
				console.error("Failed to broadcast escalation:", broadcastError);
			}
		}
	} catch (error) {
		console.error("Error escalating to human:", error);
	}

	return `Respond Exactly Like this: I have notified our support team of your request. `;
}
