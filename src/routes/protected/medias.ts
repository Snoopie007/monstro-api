import type { Elysia, Context } from "elysia";
import { ALLOWED_IMAGE_TYPES } from "@/libs/data";
import { z } from "zod";
import S3Bucket from "@/libs/s3";
const s3 = new S3Bucket();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;

const PostProps = {
    body: z.object({
        chatId: z.string(),
        files: z.array(z.object({
            name: z.string(),
            type: z.string(),
            size: z.number(),
        })),
    }),
};

const AvatarProps = {
    body: z.object({
        mid: z.string(),
        file: z.object({
            name: z.string(),
            type: z.string(),
            size: z.number(),
        }),
    }),
};

export function mediaRoutes(app: Elysia) {
    return app.post('/medias/presigned', async ({ params, body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };

        const { files, chatId } = body;

        if (!userId) {
            return status(401, { error: "Unauthorized" });
        }

        if (!files || files.length === 0) {
            return status(400, { error: 'No files provided' });
        }

        if (files.length > MAX_FILES) {
            return status(400, { error: `Maximum of ${MAX_FILES} files allowed` });
        }

        try {
            const uploadUrls = await Promise.all(
                files.filter(file => {
                    if (file.size > MAX_FILE_SIZE) {
                        return false;
                    }
                    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) {
                        return false;
                    }
                    return true;
                }).map(async (file) => {
                    const { uploadUrl, publicUrl } = await s3.getPresignedUploadUrl(
                        `chats/${chatId}`,
                        file.name,
                        file.type
                    );

                    return {
                        fileName: file.name,
                        mimeType: file.type,
                        fileSize: file.size,
                        publicUrl: publicUrl,
                        uploadUrl,
                    };
                })
            );
            return status(200, uploadUrls);
        } catch (error) {
            console.error('Error generating upload URLs:', error);
            return status(500, {
                error: 'Failed to generate upload URLs',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, PostProps).post('/medias/presigned/avatar', async ({ params, body, status, ...ctx }) => {

        const { file, mid } = body;
        const { uploadUrl, publicUrl } = await s3.getPresignedUploadUrl(
            `members/${mid}/avatars`,
            file.name,
            file.type
        );
        return status(200, { uploadUrl, publicUrl });

    }, AvatarProps)
}