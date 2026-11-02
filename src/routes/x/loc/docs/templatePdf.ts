import { Elysia, t } from "elysia";
import { and, eq, isNotNull } from "drizzle-orm";
import { PDF, type PDFPage } from "@libpdf/core";
import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { detectTemplateFields } from "@/libs/documentPdf";
import { readStoredFile, templateSourceKey } from "@/routes/shared/docs";
import { FIELD_SOURCES, contractTemplates, memberContracts } from "@/subtrees/schemas";

const isPdf = (bytes: Uint8Array) => new TextDecoder().decode(bytes.subarray(0, 5)) === "%PDF-";
const NOT_A_PDF = "That file is not a PDF we can read";
const NOT_FLAT = "This PDF has rotated or cropped pages. Print it to a new PDF, then upload that.";
// Boxes are placed on pages as they are shown. On a rotated page, or one whose visible area doesn't start at 0,0, they
// would be stamped somewhere else.
const isFlatPage = (page: PDFPage) => {
    const box = page.getCropBox();
    return page.rotation === 0 && box.x === 0 && box.y === 0;
};

const findTemplate = (lid: string, cid: string) => db.query.contractTemplates.findFirst({
    where: (c, { and, eq }) => and(eq(c.id, cid), eq(c.locationId, lid)),
});

/**
 * Uploaded PDF templates. The vendor uploads a PDF, gets suggested boxes back, then places and maps them. Saving
 * stores the PDF and its boxes together, so a template never holds a PDF without the boxes drawn for it.
 */
export const xTemplatePdf = new Elysia({ prefix: "/contracts" })
    .post("/detect", async ({ body, status }) => {
        const bytes = new Uint8Array(await body.file.arrayBuffer());
        const pdf = isPdf(bytes) ? await PDF.load(bytes).catch(() => null) : null;
        if (!pdf) return status(400, { error: NOT_A_PDF });
        if (!pdf.getPages().every(isFlatPage)) return status(400, { error: NOT_FLAT });
        const detected = await detectTemplateFields(bytes).catch(() => null);
        if (!detected) return status(400, { error: NOT_A_PDF });
        return status(200, detected);
    }, {
        body: t.Object({ file: t.File({ maxSize: "10m" }) }),
    })
    .get("/:cid/source", async ({ params, status }) => {
        const { lid, cid } = params as { lid: string; cid: string };
        const template = await findTemplate(lid, cid);
        if (!template) return status(404, { error: "Template not found" });
        if (!template.fields) return status(404, { error: "No PDF uploaded for this template" });
        const bytes = await readStoredFile(templateSourceKey(lid, cid));
        return new Response(bytes, { headers: { "Content-Type": "application/pdf", "Cache-Control": "no-store" } });
    })
    .put("/:cid/source", async ({ params, body, status }) => {
        const { lid, cid } = params as { lid: string; cid: string };
        const template = await findTemplate(lid, cid);
        if (!template) return status(404, { error: "Template not found" });
        if (!template.editable) return status(409, { error: "This template is not editable. Create a replacement template." });
        // Same rule as editing a written template. Once a member has accepted it, its terms stay as they were.
        const [accepted] = await db.select({ id: memberContracts.id }).from(memberContracts)
            .where(and(eq(memberContracts.templateId, cid), isNotNull(memberContracts.signedOn))).limit(1);
        if (accepted) return status(409, { error: "Members have accepted this template. Create and publish a replacement to change its terms." });

        const bytes = new Uint8Array(await body.file.arrayBuffer());
        const pdf = isPdf(bytes) ? await PDF.load(bytes).catch(() => null) : null;
        if (!pdf) return status(400, { error: NOT_A_PDF });
        const pages = pdf.getPages();
        if (!pages.every(isFlatPage)) return status(400, { error: NOT_FLAT });
        const offPage = body.fields.some((f) => !pages[f.page] || f.x < 0 || f.y < 0 ||
            f.x + f.width > pages[f.page]!.width + 1 || f.y + f.height > pages[f.page]!.height + 1);
        if (offPage) return status(400, { error: "A box is outside its page" });
        if (template.requireSignature && !body.fields.some((f) => f.source === "signing.signature")) {
            return status(400, { error: "This template requires a signature. Add a signature box, then save." });
        }

        const fields = body.fields.map((f) => ({ ...f, label: f.label?.trim() || undefined }));
        await new S3Bucket().uploadBuffer(bytes, templateSourceKey(lid, cid), "application/pdf");
        await db.update(contractTemplates).set({ fields, updated: new Date() })
            .where(and(eq(contractTemplates.id, cid), eq(contractTemplates.locationId, lid)));
        return status(200, { fields });
    }, {
        body: t.Object({
            file: t.File({ maxSize: "10m" }),
            // JSON in a form field, sent alongside the PDF it describes.
            fields: t.ArrayString(t.Object({
                id: t.String({ maxLength: 40 }),
                page: t.Integer({ minimum: 0 }),
                x: t.Number(),
                y: t.Number(),
                width: t.Number({ minimum: 4 }),
                height: t.Number({ minimum: 4 }),
                source: t.UnionEnum(FIELD_SOURCES),
                label: t.Optional(t.String({ maxLength: 80 })),
            }), { maxItems: 200 }),
        }),
    });
