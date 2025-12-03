import { db } from "@/db/db";
import { and, eq, inArray } from "drizzle-orm";
import { messages, media, chats, chatMembers, reactionCounts } from "@/db/schemas";
import { broadcastMessage } from "@/libs/messages";
import type { Media, Message, NewMedia } from "@/types";
import { Elysia } from "elysia";
import S3Bucket from "@/libs/s3";

const s3 = new S3Bucket();

type PostMessageProps = {
    userId: string | null;
    params: {
        cid: string;
    };
    status: any;
    body: {
        content: string;
        files?: File | File[];
    };
}

// Allowed media types
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
// const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/x-msvideo'];
// const ALLOWED_AUDIO_TYPES = ['audio/mpeg', 'audio/wav', 'audio/ogg'];
// const ALLOWED_DOCUMENT_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

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
    app.get('/messages', async ({ params, status }: PostMessageProps) => {
        const { cid } = params;

        //fail safe
        if (cid.startsWith('temp')) {
            console.log('temp chat', cid);
            return status(200, []);
        }

        try {
            const messages = await db.query.messages.findMany({
                where: (messages, { eq }) => eq(messages.chatId, cid),
                with: {
                    medias: true,
                },
                orderBy: (messages, { desc }) => desc(messages.created),

            });

            if (messages.length === 0) {
                return status(200, []);
            }
            // Get all message IDs
            const messageIds = messages.map(m => m.id) || [];

            // Multiple messages (bulk)
            const reactions = await db.select().from(reactionCounts).where(and(
                eq(reactionCounts.ownerType, 'message'),
                inArray(reactionCounts.ownerId, messageIds)
            ));

            // Group reactions by message ID
            const reactionsByMessage = reactions.reduce((acc, reaction) => {
                const messageId = reaction.ownerId; // Updated field name
                if (!messageId) return acc;
                if (!acc[messageId]) acc[messageId] = [];
                acc[messageId].push(reaction);
                return acc;
            }, {} as Record<string, any[]>);

            // Add reactions to each message
            const messagesWithReactions = messages.map(message => ({
                ...message,
                reactions: reactionsByMessage[message.id] || []
            }));
            return status(200, messagesWithReactions);
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }).post('/messages', async ({ params, body, status, userId }: PostMessageProps) => {
        console.log("post message");
        const { cid } = params;
        const { content, files } = body;


        if (!content || content.trim().length === 0) {
            return status(400, { error: 'Message content is required' });
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
                content: content.trim(),
            }).returning();

            if (!newMessage) {
                return status(500, { error: 'Failed to create message' });
            }

            let medias: Media[] = [];
            const uploadedFiles = Array.isArray(files) ? files : [files];
            if (uploadedFiles.length > 0) {
                const uploadPromises = uploadedFiles.filter(f => {
                    if (!f || !f.name) return false;
                    if (f.size > MAX_FILE_SIZE) return false;
                    if (!ALLOWED_IMAGE_TYPES.includes(f.type)) return false;
                    return true;
                }).map(async (file) => {
                    if (!file) return null;
                    try {
                        const s3Result = await s3.uploadFile(file, `chats/${cid}/medias`);
                        return {
                            ownerId: newMessage.id,
                            ownerType: 'message' as const,
                            url: s3Result.url,
                            fileName: file.name,
                            fileType: getFileTypeCategory(file.type),
                            fileSize: file.size.toString(),
                            mimeType: file.type,
                        };
                    } catch (uploadError) {
                        console.error(`Failed to upload file ${file.name}:`, uploadError);
                        return null;
                    }
                });

                const uploadedMedias = await Promise.all(uploadPromises);

                const validMedias = uploadedMedias.filter((m) => m !== null);
                if (validMedias.length > 0) {
                    const newMedias = await db.insert(media).values(validMedias).returning();
                    medias = newMedias as unknown as Media[];
                }
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
    })
    return app;
}
