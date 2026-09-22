import { db } from "@/db/db";
import { chats, locations } from "@subtrees/schemas";
import { and, eq, isNull } from "drizzle-orm";
import type { Context, Elysia } from "elysia";
import { z } from "zod";
import { findOrCreateLocationMemberChat } from "@subtrees/utils/server/locationChats";


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
                },
                orderBy: (chat, { asc }) => [asc(chat.created), asc(chat.id)]
            });

            // Find a chat where BOTH authenticated user AND target member are participants
            const existingChat = existingChats.find(chat => {
                const memberIds = chat.chatMembers.map(cm => cm.userId);
                return memberIds.length === 2 && memberIds.includes(authUserId) && memberIds.includes(memberId);
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
    app.post('/member', async ({ params, body, status, ...ctx }) => {
        const { userId: authUserId } = ctx as Context & { userId: string };
        const { lid } = params;
        const { memberId } = body;

        if (!authUserId) {
            return status(401, { message: "Unauthorized", code: "UNAUTHORIZED" });
        }

        try {
            // Need to create new chat - fetch location name
            const location = await db.query.locations.findFirst({
                where: eq(locations.id, lid),
                columns: { name: true }
            });

            if (!location) {
                return status(404, { error: 'Location not found' });
            }

            const { chat, created } = await db.transaction((tx) => findOrCreateLocationMemberChat(tx, {
                locationId: lid, locationName: location.name, senderId: authUserId, memberUserId: memberId,
            }));
            return status(created ? 201 : 200, { chatId: chat.id, ...(created ? { created: true } : {}) });
        } catch (error) {
            console.error('Error finding/creating member chat:', error);
            return status(500, { error: 'Internal server error' });
        }
    }, PostProps);

    return app;
}
