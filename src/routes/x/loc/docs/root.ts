import { Elysia } from "elysia";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db/db";
import { generatePDFBuffer } from "@/libs/PDFGenerator";
import { getDocPdf, getSignerName } from "@/routes/shared/docs";
import { renderContractContent } from "@/utils/contractUtils";

/**
 * A member document as a PDF for staff: the sealed PDF once signed, otherwise the frozen unsigned copy the member
 * sees. Only an older signed document whose file was never stored is generated now with the previous renderer.
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

        let pdf: Uint8Array | null = await getDocPdf(doc.id);
        if (!pdf) {
            const signature = doc.signedOn ? {
                image: doc.signature?.trim() ? doc.signature : null,
                name: getSignerName(doc.member),
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
