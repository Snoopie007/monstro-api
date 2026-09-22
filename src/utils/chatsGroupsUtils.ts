import { db } from "@/db/db";
import { chats, chatMembers, messages, groupMembers } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { findOrCreateLocationMemberChat } from "@subtrees/utils/server/locationChats";
import type { Location, Member, Vendor } from "@subtrees/types";
import { interEmailsAndText } from "./interpolator";

type LocationChat = Pick<Location, "name" | "welcomeMessage"> & { vendor: Pick<Vendor, "userId"> };

const DEFAULT_WELCOME_MESSAGE = `
👋 Hi {{member.firstName}}! Welcome to the {{location.name}} 🎉
We're excited to have you here! 😊 Please let us know if you have any questions.
`;

async function createLocationChat(lid: string, member: Pick<Member, "userId" | 'firstName'>, location: LocationChat) {

    const { name, welcomeMessage, vendor } = location;
    const interpolatedMsg = interEmailsAndText(welcomeMessage || DEFAULT_WELCOME_MESSAGE, { member, location });
    const startedBy = vendor.userId;

    return db.transaction(async (tx) => {
        const { chat, created } = await findOrCreateLocationMemberChat(tx, {
            locationId: lid, locationName: name, senderId: startedBy, memberUserId: member.userId,
        });
        // Do not send another welcome when a retry or workflow already created the chat.
        if (!created) return chat;

        const [message] = await tx.insert(messages).values({
            chatId: chat.id,
            content: interpolatedMsg,
            senderId: startedBy,
        }).returning({ id: messages.id });

        if (!message) {
            throw new Error("Could not save location welcome message");
        }

        await tx.update(chatMembers).set({ unreadCount: 1 }).where(and(
            eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, member.userId),
        ));
        await tx.update(chatMembers).set({ lastMessageId: message.id }).where(and(
            eq(chatMembers.chatId, chat.id), eq(chatMembers.userId, startedBy),
        ));
        return chat;
    });
}


async function addMembertoGroup(gid: string, uid: string) {

    await db.transaction(async (tx) => {
        await tx.insert(groupMembers).values({
            groupId: gid,
            userId: uid,
        }).onConflictDoNothing();
        const [chat] = await tx.select({ id: chats.id }).from(chats).where(eq(chats.groupId, gid)).limit(1);
        if (!chat) return await tx.rollback();
        await tx.insert(chatMembers).values({
            chatId: chat.id,
            userId: uid,
        }).onConflictDoNothing();
    });


}

export { createLocationChat, addMembertoGroup };
