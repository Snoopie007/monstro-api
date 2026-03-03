import { db } from "@/db/db";
import { chats, chatMembers, messages } from "@subtrees/schemas";
import type { Location, Member, Vendor } from "@subtrees/types";
import { interEmailsAndText } from "./utils";

type LocationChat = Pick<Location, "name" | "welcomeMessage"> & { vendor: Pick<Vendor, "userId"> };

const DEFAULT_WELCOME_MESSAGE = `
👋 Hi {{member.firstName}}! Welcome to the {{location.name}} 🎉
We're excited to have you here! 😊 Please let us know if you have any questions. ❓
`;

async function createLocationChat(lid: string, member: Pick<Member, "userId" | 'firstName'>, location: LocationChat) {

    const { name, welcomeMessage, vendor } = location;
    const interpolatedMsg = interEmailsAndText(welcomeMessage || DEFAULT_WELCOME_MESSAGE, { member, location });
    const startedBy = vendor.userId;

    await db.transaction(async (tx) => {
        const [chat] = await tx.insert(chats).values({
            startedBy,
            locationId: lid,
            name,
        }).returning({ id: chats.id });
        if (!chat) {
            return await tx.rollback();
        }

        const [message] = await tx.insert(messages).values({
            chatId: chat.id,
            content: interpolatedMsg,
            senderId: startedBy,
        }).returning({ id: messages.id });

        if (!message) {
            return await tx.rollback();
        }

        await tx.insert(chatMembers).values([{
            chatId: chat.id,
            userId: member.userId,
            unreadCount: 1,
        },
        {
            chatId: chat.id,
            userId: startedBy,
            lastMessageId: message.id,
        }]);

    });
}


export default createLocationChat;