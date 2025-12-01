import type { Elysia } from "elysia";
import { db } from "@/db/db";
import { chats, chatMembers, locations } from "@/db/schemas";
import { eq, and, isNull } from "drizzle-orm";

type PostProps = {
    userId: string | null;
    params: { lid: string };
    body: { memberId: string };
    status: any;
};

type GetProps = {
    userId: string | null;
    params: { lid: string };
    query: { memberId: string };
    status: any;
};

export function memberChatRoute(app: Elysia) {
    // Find existing location chat for a member (GET - doesn't create)
    app.get('/member', async ({ params, query, status, userId }: GetProps) => {
        const { lid } = params;
        const { memberId } = query;

        if (!userId) {
            return status(401, { error: 'User not authenticated' });
        }

        if (!memberId) {
            return status(400, { error: 'memberId query param is required' });
        }

        try {
            const existingChats = await db.query.chats.findMany({
                where: and(
                    eq(chats.locationId, lid),
                    isNull(chats.groupId)
                ),
                with: {
                    chatMembers: true
                }
            });

            const existingChat = existingChats.find(chat => 
                chat.chatMembers.some(cm => cm.userId === memberId)
            );

            if (existingChat) {
                return status(200, { chatId: existingChat.id });
            }

            // No chat exists yet - return null (not an error)
            return status(200, { chatId: null });
        } catch (error) {
            console.error('Error finding member chat:', error);
            return status(500, { error: 'Internal server error' });
        }
    });

    // Find or create location chat for a member (POST - creates if not found)
    app.post('/member', async ({ params, body, status, userId }: PostProps) => {
        const { lid } = params;
        const { memberId } = body;

        if (!userId) {
            return status(401, { error: 'User not authenticated' });
        }

        if (!memberId) {
            return status(400, { error: 'memberId is required' });
        }

        try {
            // Find existing location chat where the member is a participant
            // We need to find a chat that:
            // 1. Has location_id = lid
            // 2. Has no group_id (not a group chat)
            // 3. Has the member in chat_members
            const existingChats = await db.query.chats.findMany({
                where: and(
                    eq(chats.locationId, lid),
                    isNull(chats.groupId)
                ),
                with: {
                    chatMembers: true
                }
            });

            // Find a chat where the member is a participant
            const existingChat = existingChats.find(chat => 
                chat.chatMembers.some(cm => cm.userId === memberId)
            );

            // If chat exists and member is in it, return it
            if (existingChat) {
                return status(200, { chatId: existingChat.id });
            }

            // Need to create new chat - fetch location name
            const location = await db.query.locations.findFirst({
                where: eq(locations.id, lid),
                columns: { name: true }
            });

            if (!location) {
                return status(404, { error: 'Location not found' });
            }

            // Create the chat
            const result = await db.insert(chats).values({
                startedBy: userId,
                locationId: lid,
                name: location.name,
            }).returning();
            
            const newChat = result[0];
            if (!newChat) {
                return status(500, { error: 'Failed to create chat' });
            }

            // Add the member to the chat
            await db.insert(chatMembers).values({
                chatId: newChat.id,
                userId: memberId,
            });

            return status(201, { chatId: newChat.id, created: true });
        } catch (error) {
            console.error('Error finding/creating member chat:', error);
            return status(500, { error: 'Internal server error' });
        }
    });

    return app;
}
