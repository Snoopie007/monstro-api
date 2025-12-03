
import type { Elysia } from "elysia";
import S3Bucket from "@/libs/s3";
import { z } from "zod";
const s3 = new S3Bucket();

const LocationDocsProps = {
    params: z.object({
        file: z.string(),
        lid: z.string(),
    }),
    query: z.object({
        mid: z.string(),
    }),
};

export async function locationDocs(app: Elysia) {
    return app.get('/docs/:file', async ({ params, status, query, set }) => {
        const { file, lid } = params;

        const { mid } = query;

        if (!mid || !lid) {
            return status(400, { error: "Member ID and Location ID are required" });
        }

        try {
            // First verify the file exists in S3
            const fileKey = `members/${mid}/locations/${lid}/docs/${file}`;

            // Validate file existence by checking if we can generate a head object command
            const { HeadObjectCommand } = await import("@aws-sdk/client-s3");
            const s3Client = (s3 as any).s3Client; // Access the underlying S3 client

            try {
                await s3Client.send(new HeadObjectCommand({
                    Bucket: process.env.AWS_S3_BUCKET_NAME || "monstro-bucket",
                    Key: fileKey,
                }));
            } catch (headError: any) {
                if (headError.name === 'NotFound' || headError.$metadata?.httpStatusCode === 404) {
                    return status(404, { error: "File not found" });
                }
                throw headError; // Re-throw other errors
            }

            const url = await s3.getSignedUrl(
                fileKey,
                60 * 60 * 24 * 6, // 6 days
                true // Force download with proper headers
            );

            if (!url) {
                return status(500, { error: "Failed to generate download URL" });
            }

            // Set no-cache headers
            set.headers["cache-control"] = "no-cache, no-store, must-revalidate";
            set.headers["pragma"] = "no-cache";
            set.headers["expires"] = "0";

            return status(200, {
                url,
                filename: file,
                contentType: (s3 as any).getContentTypeFromKey(fileKey)
            });
        } catch (err) {
            console.error("Error generating signed URL:", err);
            return status(500, { error: "Failed to generate signed URL" });
        }
    }, LocationDocsProps)
}   