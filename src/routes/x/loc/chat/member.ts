import { db } from "@/db/db";
import { chatMembers, chats, locations } from "@/db/schemas";
import { and, eq, isNull } from "drizzle-orm";
import type { Context, Elysia } from "elysia";
import { z } from "zod";


const GetProps = {
    params: z.object({
        lid: z.string(),
    }),
    query: z.object({
        memberId: z.string(),
    }),
};

const PostProps = {
    params: z.object({
        lid: z.string(),
    }),
    body: z.object({
        memberId: z.string(),
    }),
};


export function memberChatRoute(app: Elysia) {
    // Find existing location DM chat between authenticated user and a member (GET - doesn't create)
    app.get('/member', async ({ params, query, status, ...ctx }) => {
        const { userId: authUserId } = ctx as Context & { userId: string };
        const { lid } = params;
        const { memberId } = query;

        if (!authUserId) {
            return status(401, { error: 'User not authenticated' });
        }

        try {
            // Find DM chats in this location (no groupId)
            const existingChats = await db.query.chats.findMany({
                where: and(
                    eq(chats.locationId, lid),
                    isNull(chats.groupId)
                ),
                with: {
                    chatMembers: true
                }
            });

            // Find a chat where BOTH authenticated user AND target member are participants
            const existingChat = existingChats.find(chat => {
                const memberIds = chat.chatMembers.map(cm => cm.userId);
                return memberIds.includes(authUserId) && memberIds.includes(memberId);
            });

            if (existingChat) {
                return status(200, { chatId: existingChat.id });
            }
            // No chat exists yet - return null (not an error)
            return status(200, { chatId: null });
        } catch (error) {
            console.error('Error finding member chat:', error);
            return status(500, { error: 'Internal server error' });
        }
    }, GetProps)

    // Find or create a DM chat between authenticated user and a member (POST - creates if needed)
    .post('/member', async ({ params, body, status, ...ctx }) => {
        const { userId: authUserId } = ctx as Context & { userId: string };
        const { lid } = params;
        const { memberId } = body;

        if (!authUserId) {
            return status(401, { error: 'User not authenticated' });
        }

        try {
            // Find DM chats in this location (no groupId)
            const existingChats = await db.query.chats.findMany({
                where: and(
                    eq(chats.locationId, lid),
                    isNull(chats.groupId)
                ),
                with: {
                    chatMembers: true
                }
            });

            // Find a chat where BOTH authenticated user AND target member are participants
            const existingChat = existingChats.find(chat => {
                const memberIds = chat.chatMembers.map(cm => cm.userId);
                return memberIds.includes(authUserId) && memberIds.includes(memberId);
            });

            // If chat exists with both users, return it
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
                startedBy: authUserId,
                locationId: lid,
                name: location.name,
            }).returning();

            const newChat = result[0];
            if (!newChat) {
                return status(500, { error: 'Failed to create chat' });
            }

            // Add BOTH users to the chat
            await db.insert(chatMembers).values([
                { chatId: newChat.id, userId: authUserId },
                { chatId: newChat.id, userId: memberId },
            ]);

            return status(201, { chatId: newChat.id, created: true });
        } catch (error) {
            console.error('Error finding/creating member chat:', error);
            return status(500, { error: 'Internal server error' });
        }
    }, PostProps);

    return app;
}
