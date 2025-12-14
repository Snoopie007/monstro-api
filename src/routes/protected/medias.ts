import type { Elysia, Context } from "elysia";
import { ALLOWED_IMAGE_TYPES } from "@/libs/data";
import { z } from "zod";
import S3Bucket from "@/libs/s3";
const s3 = new S3Bucket();

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_FILES = 10;


const FileProps = z.object({
    name: z.string(),
    type: z.string(),
    size: z.number(),
});


const PostProps = {
    body: z.object({
        chatId: z.string(),
        files: z.array(FileProps),
    }),
};

const AvatarProps = {
    body: z.object({
        mid: z.string(),
        file: FileProps,
    }),
};

const MomentsProps = {
    body: z.object({
        files: z.array(FileProps),
    }),
};



export function mediaRoutes(app: Elysia) {
    app.post('/medias/presigned', async ({ params, body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };

        const { files, chatId } = body;

        if (!userId) {
            return status(401, { error: "Unauthorized" });
        }

        validateFiles(files);

        try {
            const { uploadUrls } = await GenerateUploadUrls(files, `chats/${chatId}`);
            return status(200, uploadUrls);
        } catch (error) {
            console.error('Error generating upload URLs:', error);
            return status(500, {
                error: 'Failed to generate upload URLs',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, PostProps)

    app.post('/medias/presigned/avatar', async ({ params, body, status, ...ctx }) => {

        const { file, mid } = body;

        try {
            const { uploadUrl, publicUrl } = await s3.getPresignedUploadUrl(
                `members/${mid}/avatars`,
                file.name,
                file.type
            );
            return status(200, { uploadUrl, publicUrl });
        } catch (error) {
            console.error('Error generating upload URLs:', error);
            return status(500, {
                error: 'Failed to generate upload URLs',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, AvatarProps)

    app.post('/medias/presigned/moments', async ({ params, body, status, ...ctx }) => {
        const { userId } = ctx as Context & { userId: string };

        const { files } = body;

        if (!userId) {
            return status(401, { error: "Unauthorized" });
        }

        validateFiles(files);
        try {
            const { uploadUrls } = await GenerateUploadUrls(files, `moments/${userId}`);
            return status(200, uploadUrls);
        } catch (error) {
            console.error('Error generating upload URLs:', error);
            return status(500, {
                error: 'Failed to generate upload URLs',
                message: error instanceof Error ? error.message : 'Unknown error'
            });
        }
    }, MomentsProps)


    return app;
}

type File = {
    name: string;
    type: string;
    size: number;
}


function validateFiles(files: File[]) {
    if (!files || files.length === 0) {
        throw new Error('No files provided');
    }

    if (files.length > MAX_FILES) {
        throw new Error(`Maximum of ${MAX_FILES} files allowed`);
    }
}


async function GenerateUploadUrls(files: File[], path: string) {

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
                path,
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
    return { uploadUrls };
}