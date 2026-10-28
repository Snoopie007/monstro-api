import { Elysia } from "elysia";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { generatePDFBuffer } from "@/libs/PDFGenerator";
import { getSignerName } from "@/routes/shared/docs";
import { renderContractContent } from "@/utils/contractUtils";

/** The PDF saved when the member signed: the record of what they signed. */
async function getStoredPdf(memberId: string, lid: string, filename: string) {
    const url = await new S3Bucket().getSignedUrl(`members/${memberId}/locations/${lid}/docs/${filename}`, 60);
    if (!url) return null;
    const response = await fetch(url);
    return response.ok ? Buffer.from(await response.arrayBuffer()) : null;
}

/**
 * A member document as a PDF for staff. A signed document returns the PDF stored at signing; anything else
 * (unsigned, or signed without a stored file) is generated now with the same generator and signature block.
 */
export const xDocs = new Elysia({ prefix: "/docs" })
    .get("/:did/pdf", async ({ params, status }) => {
        const { lid, did } = params as { lid: string; did: string };
        const doc = await db.query.memberContracts.findFirst({
            where: (d, { and, eq }) => and(eq(d.id, did), eq(d.locationId, lid)),
            with: { contractTemplate: true, location: true, member: true, pricing: { with: { plan: true } } },
        });
        if (!doc?.contractTemplate || doc.contractTemplate.locationId !== lid) {
            return status(404, { error: "Document not found" });
        }

        let pdf: Buffer | null = doc.signedOn && doc.pdfFilename ? await getStoredPdf(doc.memberId, lid, doc.pdfFilename) : null;
        if (!pdf) {
            const signature = doc.signedOn ? {
                image: doc.signature?.trim() ? doc.signature : null,
                name: await db.transaction((tx) => getSignerName(tx, doc)),
                signedOn: formatInTimeZone(doc.signedOn, doc.location.timezone, "MMMM d, yyyy"),
            } : undefined;
            const content = renderContractContent(doc.contractTemplate.content, {
                location: doc.location,
                member: doc.member,
                pricing: doc.pricing,
            });
            pdf = await generatePDFBuffer(doc.contractTemplate.title, content, signature);
        }

        return new Response(new Uint8Array(pdf), {
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `attachment; filename="${doc.id}.pdf"`,
            },
        });
    });
