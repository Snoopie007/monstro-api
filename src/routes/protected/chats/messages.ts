import { db } from "@/db/db";
import { chatMembers, chats, media, messages, reactionCounts, users } from "@/db/schemas";
import { broadcastMessage, broadcastMessageUpdate, broadcastMessageDelete } from "@/libs/messages";
import type { Media, Message, ReactionCounts, MessageReply, MessageSender, User } from "@/types";
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
        replyId: z.string().optional(),
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
    app.get('/messages', async ({ params, set }) => {
        const { cid } = params as { cid: string };
        try {
            // Fetch messages with sender and media relations
            const messageRows = await db.query.messages.findMany({
                where: (messages, { eq }) => eq(messages.chatId, cid),
                with: {
                    medias: true,
                },
                limit: 50,
                orderBy: (messages, { asc }) => asc(messages.created),
            });

            // Get message IDs for reaction lookup
            const messageIds = messageRows.map(m => m.id);

            // Fetch reactions in bulk
            let reactionsByMessage: Record<string, ReactionCounts[]> = {};
            if (messageIds.length > 0) {
                const reactions = await db.select().from(reactionCounts).where(and(
                    eq(reactionCounts.ownerType, 'message'),
                    inArray(reactionCounts.ownerId, messageIds)
                ));

                // Group reactions by message ID
                reactionsByMessage = reactions.reduce((acc, reaction) => {
                    const messageId = reaction.ownerId;
                    if (!messageId) return acc;
                    if (!acc[messageId]) acc[messageId] = [];
                    acc[messageId].push(reaction);
                    return acc;
                }, {} as Record<string, ReactionCounts[]>);
            }

            // Gather reply IDs and get their info (id/content/senderId)
            // First, check which reply IDs are NOT already in messageRows
            const messageRowIdsSet = new Set(messageRows.map(m => m.id));
            const allReplyIds = Array.from(new Set(messageRows
                .map(m => m.replyId)
                .filter((id): id is string => !!id)
            ));
            // Only pull replies not already in messageRows
            const replyIdsToFetch = allReplyIds.filter(id => !messageRowIdsSet.has(id));

            let replies: Omit<MessageReply, 'sender'>[] = [];
            if (replyIdsToFetch.length > 0) {
                replies = await db.select({
                    id: messages.id,
                    content: messages.content,
                    senderId: messages.senderId,
                }).from(messages).where(inArray(messages.id, replyIdsToFetch));
            }


            // Transform to client format
            const enrichedMessages = messageRows.map(msg => {

                let reply: MessageReply | undefined;
                if (msg.replyId) {
                    // check if the reply is in the messageRows or replies
                    const replyProxy = messageRows.find(r => r.id === msg.replyId) ||
                        replies.find(r => r.id === msg.replyId);
                    // if the reply is found, get its sender
                    if (replyProxy) {
                        reply = {
                            id: replyProxy.id,
                            senderId: replyProxy.senderId,
                            content: replyProxy.content,
                        };
                    }
                }
                return {
                    ...msg,
                    reply,
                    reactions: reactionsByMessage[msg.id] || [],
                };
            });

            set.status = 200;
            return enrichedMessages;
        } catch (error) {
            console.error('Error fetching messages:', error);
            set.status = 500;
            return { error: 'Failed to load messages' };
        }
    }, GetProps)

    app.post('/messages', async ({ params, body, set, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };

        const { cid } = params as { cid: string };
        const { content, files, replyId } = body;

        if (!content && (!files || files.length === 0)) {
            set.status = 400;
            return { error: 'Invalid message format. Either type something or attach a file.' };
        }
        try {
            // For location chats, auto-add sender to chat_members if not already present
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
                replyId: replyId || null,
            }).returning();

            if (!newMessage) {
                set.status = 500;
                return { error: 'Failed to create message' };
            }

            let medias: Media[] = [];
            if (files && files.length > 0) {
                console.log('[DEBUG] Inserting media for message:', {
                    messageId: newMessage.id,
                    fileCount: files.length,
                    files: files.map((f: any) => ({ fileName: f.fileName, url: f.url }))
                });

                medias = await db.insert(media).values(files.map((file: any) => ({
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

            set.status = 201;
            return enrichedMessage;
        } catch (error) {
            console.error('Error sending message:', error);
            set.status = 500;
            return { error: 'Internal server error' };
        }
    }, PostProps)

    app.put('/messages/:mid', async ({ params, body, set, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        const { cid, mid } = params as { cid: string; mid: string };
        const { content } = body;

        if (!content || content.trim().length === 0) {
            set.status = 400;
            return { error: 'Message content is required' };
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
                set.status = 404;
                return { error: 'Message not found' };
            }

            if (message.senderId !== userId) {
                set.status = 403;
                return { error: 'You can only edit your own messages' };
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
                set.status = 500;
                return { error: 'Failed to update message' };
            }

            // Get latest medias after update (for enrichment)
            const updatedMedias = await db.select().from(media).where(and(
                eq(media.ownerType, 'message'),
                eq(media.ownerId, mid)
            ));

            const enrichedMessage: Message = {
                ...updatedMessage,
                medias: updatedMedias as Media[],
            };

            // Broadcast the updated message
            await broadcastMessageUpdate(cid, enrichedMessage);

            set.status = 200;
            return enrichedMessage;
        } catch (error) {
            console.error('Error updating message:', error);
            set.status = 500;
            return { error: 'Internal server error' };
        }
    }, PutProps)

    app.delete('/messages/:mid', async ({ params, set, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };
        const { cid, mid } = params as { cid: string; mid: string };

        try {
            // Find the message and verify ownership
            const message = await db.query.messages.findFirst({
                where: (messages, { eq, and }) => and(
                    eq(messages.id, mid),
                    eq(messages.chatId, cid)
                ),
            });

            if (!message) {
                set.status = 404;
                return { error: 'Message not found' };
            }

            if (message.senderId !== userId) {
                set.status = 403;
                return { error: 'You can only delete your own messages' };
            }

            // Delete the message (cascade will handle media and reactions)
            await db.delete(messages).where(eq(messages.id, mid));

            // Broadcast the deletion
            await broadcastMessageDelete(cid, mid);

            set.status = 200;
            return { success: true };
        } catch (error) {
            console.error('Error deleting message:', error);
            set.status = 500;
            return { error: 'Internal server error' };
        }
    }, DeleteProps);

    return app;
}
