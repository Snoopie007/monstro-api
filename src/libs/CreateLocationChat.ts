import { db } from "@/db/db";
import { chats, chatMembers } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
async function createLocationChat(lid: string, mid: string) {

    await db.transaction(async (tx) => {
        const [chat] = await tx.insert(chats).values({
            startedBy: lid,
            locationId: lid,
        }).returning({ id: chats.id });
        if (!chat) {
            return await tx.rollback();
        }
        await tx.insert(chatMembers).values({
            chatId: chat.id,
            userId: mid,
            unreadCount: 1,
        });
    });
}
export default createLocationChat;