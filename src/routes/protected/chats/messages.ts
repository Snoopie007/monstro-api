import { db } from "@/db/db";
import { chatMembers, chats, media, messages, reactionCounts } from "@/db/schemas";
import { broadcastMessage, broadcastMessageUpdate, broadcastMessageDelete } from "@/libs/messages";
import S3Bucket from "@/libs/s3";
import type { Media, Message } from "@/types";
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
const PutProps = {
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


export function messageRoute(app: Elysia) {
    // Get messages for a chat with media and reactions
    app.get('/messages', async ({ params, status }) => {
        const { cid } = params;

        try {
            // Fetch messages with sender and media relations
            const messagesData = await db.query.messages.findMany({
                where: (messages, { eq }) => eq(messages.chatId, cid),
                with: {
                    sender: {
                        columns: {
                            id: true,
                            name: true,
                            image: true,
                        }
                    },
                    medias: true,
                },
                orderBy: (messages, { asc }) => asc(messages.created),
            });

            // Get message IDs for reaction lookup
            const messageIds = messagesData.map(m => m.id);

            // Fetch reactions in bulk
            let reactionsMap: Record<string, any[]> = {};
            if (messageIds.length > 0) {
                const reactions = await db.select()
                    .from(reactionCounts)
                    .where(
                        and(
                            eq(reactionCounts.ownerType, 'message'),
                            inArray(reactionCounts.ownerId, messageIds)
                        )
                    );

                reactions.forEach(r => {
                    if (!reactionsMap[r.ownerId]) {
                        reactionsMap[r.ownerId] = [];
                    }
                    reactionsMap[r.ownerId]?.push({
                        display: r.display,
                        name: r.name,
                        count: r.count,
                        type: r.type,
                        userIds: r.userIds || [],
                        userNames: r.userNames || [],
                        ownerType: r.ownerType,
                        ownerId: r.ownerId,
                    });
                });
            }

            // Transform to client format
            const enrichedMessages = messagesData.map(msg => ({
                id: msg.id,
                chatId: msg.chatId,
                senderId: msg.senderId,
                content: msg.content,
                metadata: msg.metadata,
                created: msg.created,
                updated: msg.updated,
                sender: msg.sender || null,
                media: (msg.medias || []).map(m => ({
                    id: m.id,
                    ownerId: m.ownerId,
                    ownerType: m.ownerType,
                    url: m.url,
                    thumbnailUrl: m.thumbnailUrl,
                    fileName: m.fileName,
                    fileType: m.fileType,
                    mimeType: m.mimeType,
                    altText: m.altText,
                    fileSize: m.fileSize,
                    metadata: m.metadata,
                    created: m.created,
                    updated: m.updated,
                })),
                reactions: reactionsMap[msg.id] || [],
            }));

            return status(200, enrichedMessages);
        } catch (error) {
            console.error('Error fetching messages:', error);
            return status(500, { error: 'Failed to load messages' });
        }
    }, GetProps)

    .post('/messages', async ({ params, body, status, ...ctx }) => {
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
                console.log('[DEBUG] Inserting media for message:', {
                    messageId: newMessage.id,
                    fileCount: files.length,
                    files: files.map(f => ({ fileName: f.fileName, url: f.url }))
                });

                medias = await db.insert(media).values(files.map(file => ({
                    ...file,
                    ownerId: newMessage.id,
                    ownerType: 'message' as const,
                    fileType: getFileTypeCategory(file.mimeType),
                }))).returning();

                console.log('[DEBUG] Inserted media:', {
                    count: medias.length,
                    ids: medias.map(m => m.id)
                });
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
    }, PostProps).put('/messages/:mid', async ({ params, body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        const { cid, mid } = params;
        const { content } = body;

        if (!content || content.trim().length === 0) {
            return status(400, { error: 'Message content is required' });
        }

        try {
            // Find the message and verify ownership
            const message = await db.query.messages.findFirst({
                where: (messages, { eq, and }) => and(
                    eq(messages.id, mid),
                    eq(messages.chatId, cid)
                ),
                with: {
                    sender: true,
                    medias: true,
                },
            });

            if (!message) {
                return status(404, { error: 'Message not found' });
            }

            if (message.senderId !== userId) {
                return status(403, { error: 'You can only edit your own messages' });
            }

            // Update the message
            const [updatedMessage] = await db.update(messages)
                .set({
                    content: content.trim(),
                    updated: new Date(),
                })
                .where(eq(messages.id, mid))
                .returning();

            if (!updatedMessage) {
                return status(500, { error: 'Failed to update message' });
            }



            // Enrich the message
            const enrichedMessage: Message = {
                ...updatedMessage,

            };

            // Broadcast the updated message
            await broadcastMessageUpdate(cid, enrichedMessage);

            return status(200, enrichedMessage);
        } catch (error) {
            console.error('Error updating message:', error);
            return status(500, { error: 'Internal server error' });
        }
    }, PutProps).delete('/messages/:mid', async ({ params, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        const { cid, mid } = params;

        try {
            // Find the message and verify ownership
            const message = await db.query.messages.findFirst({
                where: (messages, { eq, and }) => and(
                    eq(messages.id, mid),
                    eq(messages.chatId, cid)
                ),
            });

            if (!message) {
                return status(404, { error: 'Message not found' });
            }

            if (message.senderId !== userId) {
                return status(403, { error: 'You can only delete your own messages' });
            }

            // Delete the message (cascade will handle media and reactions)
            await db.delete(messages).where(eq(messages.id, mid));

            // Broadcast the deletion
            await broadcastMessageDelete(cid, mid);

            return status(200, { success: true });
        } catch (error) {
            console.error('Error deleting message:', error);
            return status(500, { error: 'Internal server error' });
        }
    }, DeleteProps);
    return app;
}
