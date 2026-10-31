import { Elysia, t } from "elysia";
import { and, eq, isNotNull } from "drizzle-orm";
import { PDF } from "@libpdf/core";
import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { DATA_SOURCES, SIGNING_SOURCES, detectTemplateFields } from "@/libs/documentPdf";
import { readStoredFile, templateSourceKey } from "@/routes/shared/docs";
import { contractTemplates, memberContracts, type TemplateField } from "@/subtrees/schemas";

const ALLOWED_SOURCES = new Set<string>([...DATA_SOURCES, ...SIGNING_SOURCES]);

const findTemplate = (lid: string, cid: string) => db.query.contractTemplates.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, cid), eq(c.locationId, lid)),
});

/** Same rule as editing a written template: once a member has accepted it, its terms stay as they were. */
async function isAccepted(cid: string) {
    const [accepted] = await db.select({ id: memberContracts.id }).from(memberContracts)
        .where(and(eq(memberContracts.templateId, cid), isNotNull(memberContracts.signedOn))).limit(1);
    return Boolean(accepted);
}
const ACCEPTED_ERROR = "Members have accepted this template. Create and publish a replacement to change its terms.";

/**
 * Uploaded PDF templates: the vendor uploads a PDF, gets suggested boxes back, places and maps them, then saves the
 * box map. Members' documents are built from the stored PDF and that map.
 */
export const xTemplatePdf = new Elysia({ prefix: "/contracts" })
    .post("/:cid/source", async ({ params, body, status }) => {
        const { lid, cid } = params as { lid: string; cid: string };
        const template = await findTemplate(lid, cid);
        if (!template) return status(404, { error: "Template not found" });
        if (!template.editable) return status(409, { error: "This template is not editable. Create a replacement template." });
        if (await isAccepted(cid)) return status(409, { error: ACCEPTED_ERROR });

        const bytes = new Uint8Array(await body.file.arrayBuffer());
        if (new TextDecoder().decode(bytes.subarray(0, 5)) !== "%PDF-") return status(400, { error: "That file is not a PDF" });
        let detected: Awaited<ReturnType<typeof detectTemplateFields>>;
        try {
            detected = await detectTemplateFields(bytes);
        } catch {
            return status(400, { error: "That PDF could not be read" });
        }
        await new S3Bucket().uploadBuffer(bytes, templateSourceKey(lid, cid), "application/pdf");
        return status(200, detected);
    }, {
        body: t.Object({ file: t.File({ maxSize: "10m" }) }),
    })
    .get("/:cid/source", async ({ params, status }) => {
        const { lid, cid } = params as { lid: string; cid: string };
        if (!await findTemplate(lid, cid)) return status(404, { error: "Template not found" });
        const bytes = await readStoredFile(templateSourceKey(lid, cid));
        if (!bytes) return status(404, { error: "No PDF uploaded for this template" });
        return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
    })
    .put("/:cid/fields", async ({ params, body, status }) => {
        const { lid, cid } = params as { lid: string; cid: string };
        const template = await findTemplate(lid, cid);
        if (!template) return status(404, { error: "Template not found" });
        if (!template.editable) return status(409, { error: "This template is not editable. Create a replacement template." });
        if (await isAccepted(cid)) return status(409, { error: ACCEPTED_ERROR });
        const source = await readStoredFile(templateSourceKey(lid, cid));
        if (!source) return status(400, { error: "Upload the PDF before saving its boxes" });

        const pages = (await PDF.load(source)).getPages();
        const unmapped = body.fields.filter((f) => !ALLOWED_SOURCES.has(f.source));
        if (unmapped.length) return status(400, { error: `Choose what goes in ${unmapped.length === 1 ? "1 box" : `${unmapped.length} boxes`}` });
        const offPage = body.fields.some((f) => !pages[f.page] || f.x < 0 || f.y < 0 ||
            f.x + f.width > pages[f.page]!.width + 1 || f.y + f.height > pages[f.page]!.height + 1);
        if (offPage) return status(400, { error: "A box is outside its page" });
        if (template.requireSignature && !body.fields.some((f) => f.source === "signing.signature")) {
            return status(400, { error: "This template requires a signature: add a signature box" });
        }

        const fields: TemplateField[] = body.fields.map((f) => ({ ...f, label: f.label?.trim() || undefined }));
        await db.update(contractTemplates).set({ fields, updated: new Date() })
            .where(and(eq(contractTemplates.id, cid), eq(contractTemplates.locationId, lid)));
        return status(200, { fields });
    }, {
        body: t.Object({
            fields: t.Array(t.Object({
                id: t.String({ maxLength: 40 }),
                page: t.Integer({ minimum: 0 }),
                x: t.Number(),
                y: t.Number(),
                width: t.Number({ minimum: 4 }),
                height: t.Number({ minimum: 4 }),
                source: t.String(),
                label: t.Optional(t.String({ maxLength: 80 })),
            }), { maxItems: 200 }),
        }),
    });
