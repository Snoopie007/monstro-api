import { and, asc, eq, getTableColumns, isNull, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { chats, chatMembers } from "../../schemas/chat/chats";

type ChatTransaction = Pick<PostgresJsDatabase, "select" | "insert" | "execute">;
type LocationMemberChat = {
	locationId: string;
	locationName: string;
	senderId: string;
	memberUserId: string;
};

/**
 * Shared by member joins, the location chat API, and workflow workers.
 * Call inside a transaction. Location + both users identify the conversation.
 */
export async function findOrCreateLocationMemberChat(tx: ChatTransaction, input: LocationMemberChat) {
	if (input.senderId === input.memberUserId) throw new Error("Location chat needs two different users");
	// All writers take the same lock so joining and workflow execution cannot
	// both create a chat. Different locations have independent conversations.
	const key = JSON.stringify([input.locationId, ...[input.senderId, input.memberUserId].sort()]);
	await tx.execute(sql`select pg_advisory_xact_lock(hashtextextended(${`location-member-chat:${key}`}, 0))`);
	const senderMembership = alias(chatMembers, "location_chat_sender");
	const memberMembership = alias(chatMembers, "location_chat_member");
	let [chat] = await tx.select(getTableColumns(chats)).from(chats)
		.innerJoin(senderMembership, and(
			eq(senderMembership.chatId, chats.id), eq(senderMembership.userId, input.senderId),
		))
		.innerJoin(memberMembership, and(
			eq(memberMembership.chatId, chats.id), eq(memberMembership.userId, input.memberUserId),
		))
		.where(and(
			eq(chats.locationId, input.locationId),
			isNull(chats.groupId),
			sql`(select count(*) from ${chatMembers} where ${chatMembers.chatId} = ${chats.id}) = 2`,
		))
		.orderBy(asc(chats.created), asc(chats.id)).limit(1).for("update", { of: chats });
	const created = !chat;
	if (!chat) {
		[chat] = await tx.insert(chats).values({
			startedBy: input.senderId, locationId: input.locationId, name: input.locationName,
		}).returning();
		if (!chat) throw new Error("Could not create location-member chat");
		await tx.insert(chatMembers).values([
			{ chatId: chat.id, userId: input.senderId },
			{ chatId: chat.id, userId: input.memberUserId },
		]);
	}
	// Recheck after acquiring the chat lock; membership may have changed
	// while the lookup waited. Never reuse a chat with extra participants.
	const participants = await tx.select({ userId: chatMembers.userId }).from(chatMembers)
		.where(eq(chatMembers.chatId, chat.id));
	if (participants.length !== 2 || participants.some((member) =>
		member.userId !== input.senderId && member.userId !== input.memberUserId
	)) throw new Error("Location-member chat membership changed");
	return { chat, created };
}
