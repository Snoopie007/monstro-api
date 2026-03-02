import { db } from "@/db/db";
import {
    chatMembers, chats, media,
    messages, reactionCounts
} from "@subtrees/schemas";
import {
    broadcastMessage,
    broadcastMessageUpdate, broadcastMessageDelete,
    broadcastMessageUnread
} from "@/libs/broadcast/messages";
import type {
    Media, Message,
    ReactionCount, MessageReply
} from "@subtrees/types";
import { and, eq, inArray, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { ALLOWED_IMAGE_TYPES } from "@subtrees/constants/data";
import { ServerState } from '@/state';
const MessageProps = {
    params: t.Object({
        uid: t.String(),
        cid: t.String(),
    }),
};

const PostProps = {
    ...MessageProps,
    body: t.Object({
        content: t.Optional(t.String()),
        tempId: t.Optional(t.String()),
        activeUsersIds: t.Array(t.String()),
        replyId: t.Optional(t.String()),
        files: t.Optional(t.Array(t.Object({
            fileName: t.String(),
            mimeType: t.String(),
            fileSize: t.Number(),
            url: t.String(),
        })))
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
        const { cid } = params;
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

            if (messageRows.length === 0) {
                set.status = 200;
                return [];
            }

            // Get message IDs for reaction lookup
            const messageIds = messageRows.map(m => m.id);

            // Fetch reactions in bulk
            let reactionsByMessage: Record<string, ReactionCount[]> = {};
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
                }, {} as Record<string, ReactionCount[]>);
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
    }, MessageProps)

    app.post('/messages', async ({ params, body, set }) => {

        const { cid, uid } = params;
        const { content, files, replyId, activeUsersIds, tempId } = body;

        if (!content && (!files || files.length === 0)) {
            set.status = 400;
            return { error: 'Invalid message format. Either type something or attach a file.' };
        }
        try {
            // For location chats, auto-add sender to chat_members if not already present
            const chat = await db.query.chats.findFirst({
                where: eq(chats.id, cid),
                with: {
                    chatMembers: {
                        columns: {
                            userId: true,
                        }
                    }
                }
            });

            if (chat?.locationId) {
                // This is a location chat - check if sender is already a member
                const existingMembership = await db.query.chatMembers.findFirst({
                    where: and(
                        eq(chatMembers.chatId, cid),
                        eq(chatMembers.userId, uid)
                    ),
                });

                if (!existingMembership) {
                    // Add sender as a chat member
                    await db.insert(chatMembers).values({
                        chatId: cid,
                        userId: uid,
                    });
                }
            }

            // Insert the message first
            const [newMessage] = await db.insert(messages).values({
                ...(tempId ? { id: tempId } : {}),
                chatId: cid,
                senderId: uid,
                content: content?.trim() || null,
                replyId: replyId || null,
            }).returning();

            if (!newMessage) {
                set.status = 500;
                return { error: 'Failed to create message' };
            }

            let medias: Media[] = [];
            if (files && files.length > 0) {
                // console.log('[DEBUG] Inserting media for message:', {
                //     messageId: newMessage.id,
                //     fileCount: files.length,
                //     files: files.map((f: any) => ({ fileName: f.fileName, url: f.url }))
                // });

                medias = await db.insert(media).values(files.map((file: any) => ({
                    ...file,
                    ownerId: newMessage.id,
                    ownerType: 'message' as const,
                    fileType: getFileTypeCategory(file.mimeType),
                }))).returning();

                // console.log('[DEBUG] Inserted media:', {
                //     count: medias.length,
                //     ids: medias.map(m => m.id)
                // });
            }

            const enrichedMessage: Message = {
                ...newMessage,
                medias,
            };

            console.log('[DEBUG] Active users IDs:', activeUsersIds);

            let inactiveUserIds: string[] = chat?.chatMembers
                .map(m => m.userId)
                .filter(userId => !activeUsersIds.includes(userId)) || [];
            console.log('[DEBUG] Inactive users IDs:', inactiveUserIds);
            // update the last message id for active user ids the chat members
            await db.update(chatMembers).set({
                lastMessageId: newMessage.id,
            }).where(and(
                inArray(chatMembers.userId, activeUsersIds),
                eq(chatMembers.chatId, cid)
            ));


            broadcastMessage(cid, enrichedMessage);


            if (inactiveUserIds && inactiveUserIds.length > 0) {
                // Find offline users from the inactiveUserIds

                // Get fresh list of online users
                const onlineUserIds: string[] = Array.from(ServerState.onlineUsers.keys());
                console.log('[DEBUG] Server state:', ServerState);
                console.log('[DEBUG] Online users IDs:', onlineUserIds);

                const offlineUserIds: string[] = [];

                const inactiveButOnlineUserIds: string[] = [];
                for (const id of inactiveUserIds) {
                    if (!onlineUserIds.includes(id)) {
                        offlineUserIds.push(id);
                    } else {
                        inactiveButOnlineUserIds.push(id);
                    }
                }

                console.log('[DEBUG] Offline users:', offlineUserIds);

                // Only update unreadCount and broadcast for inactive-but-online users
                if (inactiveButOnlineUserIds.length > 0) {
                    await db.update(chatMembers).set({
                        unreadCount: sql`${chatMembers.unreadCount} + 1`,
                    }).where(and(
                        inArray(chatMembers.userId, inactiveButOnlineUserIds),
                        eq(chatMembers.chatId, cid)
                    ));
                    broadcastMessageUnread(cid, enrichedMessage, inactiveUserIds);
                }

                // Optionally: handle offlineUserIds (e.g., send push notification)
                if (onlineUserIds.length > 0) {
                    // send notification to users not using the app

                }
            }


            set.status = 201;
            return enrichedMessage;
        } catch (error) {
            console.error('Error sending message:', error);
            set.status = 500;
            return { error: 'Internal server error' };
        }
    }, PostProps)

    app.put('/messages/:messageId', async ({ params, body, set }) => {
        const { cid, messageId, uid } = params;
        const { content } = body;

        if (!content || content.trim().length === 0) {
            set.status = 400;
            return { error: 'Message content is required' };
        }

        try {
            // Find the message and verify ownership
            const message = await db.query.messages.findFirst({
                where: (messages, { eq, and }) => and(
                    eq(messages.id, messageId),
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

            if (message.senderId !== uid) {
                set.status = 403;
                return { error: 'You can only edit your own messages' };
            }

            // Update the message
            const [updatedMessage] = await db.update(messages)
                .set({
                    content: content.trim(),
                    updated: new Date(),
                })
                .where(eq(messages.id, messageId))
                .returning();

            if (!updatedMessage) {
                set.status = 500;
                return { error: 'Failed to update message' };
            }

            // Get latest medias after update (for enrichment)
            const updatedMedias = await db.select().from(media).where(and(
                eq(media.ownerType, 'message'),
                eq(media.ownerId, messageId)
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
    }, {
        params: t.Object({
            uid: t.String(),
            cid: t.String(),
            messageId: t.String(),
        }),
        body: t.Object({
            content: t.String(),
        }),
    })

    app.delete('/messages/:messageId', async ({ params, set }) => {

        const { cid, messageId, uid } = params;

        try {
            // Find the message and verify ownership
            const message = await db.query.messages.findFirst({
                where: (messages, { eq, and }) => and(
                    eq(messages.id, messageId),
                    eq(messages.chatId, cid)
                ),
            });

            if (!message) {
                set.status = 404;
                return { error: 'Message not found' };
            }

            if (message.senderId !== uid) {
                set.status = 403;
                return { error: 'You can only delete your own messages' };
            }

            // Delete the message (cascade will handle media and reactions)
            await db.delete(messages).where(eq(messages.id, messageId));

            // Broadcast the deletion
            await broadcastMessageDelete(cid, messageId);

            set.status = 200;
            return { success: true };
        } catch (error) {
            console.error('Error deleting message:', error);
            set.status = 500;
            return { error: 'Internal server error' };
        }
    }, {
        params: t.Object({
            uid: t.String(),
            cid: t.String(),
            messageId: t.String(),
        }),
    });

    return app;
}
