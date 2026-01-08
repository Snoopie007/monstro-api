
import type { Elysia } from "elysia";
import { t } from "elysia";
import S3Bucket from "@/libs/s3";
import { z } from "zod";
import { db } from "@/db/db";
import { memberContracts } from "@/db/schemas";
import type { Contract, Member } from "@/types";
const s3 = new S3Bucket();

const DownloadDocProps = {
    params: z.object({
        lid: z.string(),
        file: z.string(),
    }),
    query: z.object({
        mid: z.string(),
    }),

};

const LocationDocsProps = {
    params: t.Object({
        lid: t.String(),
    })
};

async function generatePDF(template: Contract, variables: Record<string, any>) {
    // try {
    //         const pdfBuffer = await generatePDFBuffer(template, {
    //             location: template.location,
    //             member,
    //             plan: plan,
    //         });
    //         const filename = `${template.title
    //             .toLowerCase()
    //             .replace(/ /g, "-")}-${new Date().getTime()}.pdf`;

    //         await s3.uploadBuffer(
    //             pdfBuffer,
    //             `members/${mid}/locations/${lid}/docs/${filename}`,
    //             "application/pdf"
    //         );

    //         await db.update(memberContracts)
    //             .set({ pdfFilename: filename })
    //             .where(eq(memberContracts.id, c.id));
    //     } catch (error) {
    //         console.error("Background PDF generation failed:", error);
    //     }

}

export async function locationDocs(app: Elysia) {

    app.post('/docs/', async ({ params, status, body }) => {
        const { lid } = params;
        const { mid, priceId, signature, templateId } = body;

        try {
            // const [contract] = await db.insert(memberContracts).values({
            //     memberId: mid,
            //     locationId: lid,
            //     templateId: templateId,
            //     signature: signature,
            // }).returning();


            // Generate PDF in background (non-blocking)
            // generatePDF(contract, {
            //     location: contract.location,
            //     member: contract.member,
            //     plan: contract.plan,
            // });


            return status(200, { id: "test-id" });
        } catch (error) {
            console.error(error);
            status(500, { error: 'Internal server error' });
            return { error: 'Internal server error' }
        }
    }, {
        ...LocationDocsProps,
        body: t.Object({
            mid: t.String(),
            priceId: t.String(),
            signature: t.String(t.Optional),
            templateId: t.String(),
        })
    })
    app.get('/docs/download/:file', async ({ params, status, query, set }) => {
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
    }, DownloadDocProps)
    return app;
}   