import { Elysia } from "elysia";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { blackenSignaturePng } from "@/libs/signatureImage";
import { getSignerName } from "@/routes/shared/docs";
import { renderContractContent } from "@/utils/contractUtils";

/** One member document for staff: its filled-in text and the same signature block the signed PDF shows. */
export const xDocs = new Elysia({ prefix: "/docs" })
    .get("/:did", async ({ params, status }) => {
        const { lid, did } = params as { lid: string; did: string };
        const doc = await db.query.memberContracts.findFirst({
            where: (d, { and, eq }) => and(eq(d.id, did), eq(d.locationId, lid)),
            with: { contractTemplate: true, location: true, member: true, pricing: { with: { plan: true } } },
        });
        if (!doc?.contractTemplate || doc.contractTemplate.locationId !== lid) {
            return status(404, { error: "Document not found" });
        }

        const signature = doc.signedOn ? {
            image: doc.signature?.trim() ? blackenSignaturePng(doc.signature) : null,
            name: await db.transaction((tx) => getSignerName(tx, doc)),
            signedOn: formatInTimeZone(doc.signedOn, doc.location.timezone, "MMMM d, yyyy"),
        } : null;
        const pdfUrl = doc.signedOn && doc.pdfFilename
            ? await new S3Bucket().getSignedUrl(`members/${doc.memberId}/locations/${lid}/docs/${doc.pdfFilename}`, 300)
            : null;

        return status(200, {
            id: doc.id,
            title: doc.contractTemplate.title,
            type: doc.contractTemplate.type,
            requireSignature: doc.contractTemplate.requireSignature,
            member: { id: doc.member.id, firstName: doc.member.firstName, lastName: doc.member.lastName },
            created: doc.created,
            signedOn: doc.signedOn,
            signature,
            pdfUrl,
            mdx: renderContractContent(doc.contractTemplate.content, {
                location: doc.location,
                member: doc.member,
                pricing: doc.pricing,
            }),
        });
    });
