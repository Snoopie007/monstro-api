import { db } from "@/db/db";
import { messages, media } from "@/db/schemas";
import { enrichMessage, broadcastMessage } from "@/libs/messages";
import { Elysia } from "elysia";
import S3Bucket from "@/libs/s3";
import { nanoid } from "nanoid";

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
    app.post('/messages', async ({ params, body, status, userId }: PostMessageProps) => {
        const { cid } = params;

        if (!userId) {
            return status(401, { error: 'User not authenticated' });
        }

        try {
            // In Elysia, multipart form data is automatically parsed
            // and available directly on the body object
            const { content, files } = body;

            if (!content || content.trim().length === 0) {
                return status(400, { error: 'Message content is required' });
            }

            // Insert the message first
            const result = await db.insert(messages).values({
                chatId: cid,
                senderId: userId,
                content: content.trim(),
                metadata: {},
            }).returning();

            const newMessage = result[0];
            if (!newMessage) {
                return status(500, { error: 'Failed to create message' });
            }

            // Process uploaded files (if any)
            const uploadedMedia: any[] = [];

            // Normalize files to array (could be single File or File[])
            const fileArray = files ? (Array.isArray(files) ? files : [files]) : [];

            if (fileArray.length > 0) {
                for (const file of fileArray) {
                    // Validate file
                    if (!file || !file.name) continue;

                    // Check file size
                    if (file.size > MAX_FILE_SIZE) {
                        console.warn(`File ${file.name} exceeds size limit, skipping`);
                        continue;
                    }

                    // Check file type
                    const allAllowedTypes = [
                        ...ALLOWED_IMAGE_TYPES,
                        // ...ALLOWED_VIDEO_TYPES,
                        // ...ALLOWED_AUDIO_TYPES,
                        // ...ALLOWED_DOCUMENT_TYPES
                    ];

                    if (!allAllowedTypes.includes(file.type)) {
                        console.warn(`File ${file.name} has unsupported type, skipping`);
                        continue;
                    }

                    try {
                        // Upload to S3
                        const s3Result = await s3.uploadFile(
                            file,
                            `chats/${cid}/messages/${newMessage.id}`
                        );

                        // Insert media record
                        const [mediaRecord] = await db.insert(media).values({
                            ownerId: newMessage.id,
                            ownerType: 'message',
                            fileName: file.name,
                            fileType: getFileTypeCategory(file.type),
                            fileSize: file.size.toString(),
                            mimeType: file.type,
                            url: s3Result.url,
                            thumbnailUrl: null, // Can be generated later for images/videos
                            altText: null,
                            metadata: {},
                        }).returning();

                        uploadedMedia.push(mediaRecord);
                    } catch (uploadError) {
                        console.error(`Failed to upload file ${file.name}:`, uploadError);
                        // Continue with other files
                    }
                }
            }

            // Enrich the message with media and sender info
            // This fetches sender details and media from the database
            const enrichedMessage = await enrichMessage(newMessage.id);

            if (!enrichedMessage) {
                return status(500, { error: 'Failed to enrich message' });
            }

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

