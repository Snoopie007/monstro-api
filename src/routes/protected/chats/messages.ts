import { db } from "@/db/db";
import { chatMembers, chats, media, messages, reactionCounts } from "@/db/schemas";
import { broadcastMessage } from "@/libs/messages";
import type { Message, Media } from "@/types";
import { and, eq, inArray } from "drizzle-orm";
import { Elysia, type Context } from "elysia";
import { z } from "zod";
import { ALLOWED_IMAGE_TYPES } from "@/libs/data";


const GetProps = {
    params: z.object({
        cid: z.string(),
    }),
};


const PostProps = {
    ...GetProps,
    body: z.object({
        content: z.string().optional(),
        files: z.array(z.object({
            fileName: z.string(),
            mimeType: z.string(),
            fileSize: z.number(),
            url: z.string(),
        })),
    }),
};


const DeleteProps = {
    params: z.object({
        cid: z.string(),
        mid: z.string(),
    }),
};
const PatchProps = {
    ...DeleteProps,
    body: z.object({
        content: z.string(),
    }),
};


/**
 * Determines the file type category based on MIME type
 */
function getFileTypeCategory(mimeType: string): 'image' | 'video' | 'audio' | 'document' | 'other' {
    if (ALLOWED_IMAGE_TYPES.includes(mimeType)) return 'image';
    // if (ALLOWED_VIDEO_TYPES.includes(mimeType)) return 'video';
    // if (ALLOWED_AUDIO_TYPES.includes(mimeType)) return 'audio';
    // if (ALLOWED_DOCUMENT_TYPES.includes(mimeType)) return 'document';
    return 'other';
}


export function sendMessageRoute(app: Elysia) {
    app.post('/messages', async ({ params, body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };

        const { cid } = params;
        const { content, files } = body;

        if (!content && files.length == 0) {
            return status(400, { error: 'Invalid message format. Either type something or attach a file.' });
        }
        try {

            // For location chats, auto-add sender to chat_members if not already present
            // This allows staff to join the chat on their first message
            const chat = await db.query.chats.findFirst({
                where: eq(chats.id, cid),
            });

            if (chat?.locationId) {
                // This is a location chat - check if sender is already a member
                const existingMembership = await db.query.chatMembers.findFirst({
                    where: and(
                        eq(chatMembers.chatId, cid),
                        eq(chatMembers.userId, userId!)
                    ),
                });

                if (!existingMembership) {
                    // Add sender as a chat member
                    await db.insert(chatMembers).values({
                        chatId: cid,
                        userId: userId!,
                    });
                }
            }

            // Insert the message first
            const [newMessage] = await db.insert(messages).values({
                chatId: cid,
                senderId: userId,
                content: content?.trim() || null,
            }).returning();

            if (!newMessage) {
                return status(500, { error: 'Failed to create message' });
            }



            let medias: Media[] = [];
            if (files.length > 0) {

                medias = await db.insert(media).values(files.map(file => ({
                    ...file,
                    ownerId: newMessage.id,
                    ownerType: 'message' as const,
                    fileType: getFileTypeCategory(file.mimeType),
                }))).returning();
            }

            const enrichedMessage: Message = {
                ...newMessage,
                medias,
            };

            // Broadcast the enriched message to all subscribed clients
            await broadcastMessage(cid, enrichedMessage);

            return status(201, enrichedMessage);
        } catch (error) {
            console.error('Error sending message:', error);
            return status(500, { error: 'Internal server error' });
        }
    }, PostProps);

    app.group('/messages/:mid', (a) => {
        a.patch('/', async ({ params, body, status }) => {
            const { mid } = params;
            const { content } = body;
            if (!content || content.trim().length === 0) {
                return status(400, { error: 'Message content is required' });
            }
            try {
                const message = await db.query.messages.findFirst({
                    where: eq(messages.id, mid),
                });
                if (!message) {
                    return status(404, { error: 'Message not found' });
                }
                const [updatedMessage] = await db.update(messages)
                    .set({ content: content.trim() }).where(eq(messages.id, mid)).returning();
                return status(200, updatedMessage);
            } catch (error) {
                console.error('Error updating message:', error);
                return status(500, { error: 'Internal server error' });
            }
        }, PatchProps).delete('/', async ({ params, status }) => {
            const { mid } = params;
            try {
                const message = await db.query.messages.findFirst({
                    where: eq(messages.id, mid),
                });
                if (!message) {
                    return status(404, { error: 'Message not found' });
                }
                // await db.delete(messages).where(eq(messages.id, mid));
                return status(200, { success: true });
            } catch (error) {
                console.error('Error deleting message:', error);
                return status(500, { error: 'Internal server error' });
            }
        }, DeleteProps);
        return a;
    });
    return app;
}
