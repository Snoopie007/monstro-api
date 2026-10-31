import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { PDF, P12Signer, rgb, type EmbeddedFont, type PDFPage } from "@libpdf/core";
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import type { TemplateField } from "@/subtrees/schemas";
import { interpolateContract } from "@/utils/contractUtils";

/**
 * Member document PDFs, all built with libpdf: field detection on uploaded templates, the unsigned copy a member is
 * shown (built once, then frozen), and the signed copy (stamped, given a certificate page, and sealed).
 *
 * The unsigned PDF carries its own signing boxes as a `monstro-fields.json` attachment, so signing never depends on
 * the template, which the vendor may have edited since.
 */

/** Values an uploaded template's boxes can be filled with when the document is created. */
export const DATA_SOURCES = [
    "member.name", "member.firstName", "member.lastName", "member.email", "member.phone", "member.dob",
    "location.name", "location.legalName", "location.address", "location.city", "location.state", "location.postalCode",
    "location.phone", "location.email", "plan.name", "plan.pricingName", "plan.price", "plan.interval",
] as const;
export const SIGNING_SOURCES = ["signing.signature", "signing.signerName", "signing.date", "signing.text"] as const;
export type SigningSource = typeof SIGNING_SOURCES[number];
export type SigningBox = TemplateField & { source: SigningSource };

const FIELDS_ATTACHMENT = "monstro-fields.json";
const LETTER = { width: 612, height: 792 };
const MARGIN = 54;
const INK = rgb(0.1, 0.1, 0.12);
const MUTED = rgb(0.42, 0.42, 0.46);
const BOX_BORDER = rgb(0.62, 0.64, 0.7);
const BOX_FILL = rgb(0.965, 0.97, 0.985);

export const sha256Hex = (bytes: Uint8Array) => createHash("sha256").update(bytes).digest("hex");
export const isSigningSource = (source: string): source is SigningSource => (SIGNING_SOURCES as readonly string[]).includes(source);

const fontDir = join(dirname(require.resolve("dejavu-fonts-ttf/package.json")), "ttf");
const fontFiles = { regular: "DejaVuSans.ttf", bold: "DejaVuSans-Bold.ttf", italic: "DejaVuSans-Oblique.ttf", boldItalic: "DejaVuSans-BoldOblique.ttf" };
type Fonts = Record<keyof typeof fontFiles, EmbeddedFont>;
// DejaVu covers names Helvetica cannot (Vietnamese, Polish, ...).
const embedFonts = (pdf: PDF): Fonts => Object.fromEntries(Object.entries(fontFiles).map(([k, file]) =>
    [k, pdf.embedFont(new Uint8Array(readFileSync(join(fontDir, file))))])) as Fonts;

/** Resolves `member.name`-style paths the same way written templates resolve `{{member.name}}`. */
export function resolveVariable(variables: Record<string, unknown>, path: string): string {
    const value = path.split(".").reduce<unknown>((obj, key) =>
        obj && typeof obj === "object" ? (obj as Record<string, unknown>)[key] : undefined, variables);
    if (value instanceof Date) return value.toISOString().slice(0, 10);
    return value === undefined || value === null ? "" : String(value);
}

function drawBox(page: PDFPage, box: { x: number; y: number; width: number; height: number }) {
    page.drawRectangle({ ...box, color: BOX_FILL, borderColor: BOX_BORDER, borderWidth: 0.75 });
}

/** Writes text inside a box on one line, shrinking it to fit the width. */
function drawFitted(page: PDFPage, font: EmbeddedFont, text: string, box: { x: number; y: number; width: number; height: number }) {
    if (!text) return;
    let size = Math.min(11, Math.max(6, box.height * 0.62));
    while (size > 6 && font.widthOfTextAtSize(text, size) > box.width - 6) size -= 0.5;
    page.drawText(text, { x: box.x + 3, y: box.y + (box.height - size) / 2 + size * 0.22, font, size, color: INK });
}

// ─── Written templates: Markdown → pages ──────────────────────────────────────────────────────────────────────────

type Run = { text: string; bold?: boolean; italic?: boolean };

function layoutWritten(pdf: PDF, fonts: Fonts, title: string, markdown: string) {
    const width = LETTER.width - 2 * MARGIN;
    const top = LETTER.height - MARGIN;
    let page = pdf.addPage({ size: "letter" });
    let y = top;
    const pick = (r: Run) => r.bold && r.italic ? fonts.boldItalic : r.bold ? fonts.bold : r.italic ? fonts.italic : fonts.regular;
    const ensure = (h: number) => {
        if (y - h < MARGIN) { page = pdf.addPage({ size: "letter" }); y = top; }
    };

    const inline = (nodes: any[], style: Omit<Run, "text"> = {}): Run[] => nodes.flatMap((n): Run[] => {
        if (n.type === "text" || n.type === "inlineCode") return [{ text: n.value, ...style }];
        if (n.type === "strong") return inline(n.children, { ...style, bold: true });
        if (n.type === "emphasis") return inline(n.children, { ...style, italic: true });
        if (n.type === "link") {
            // Keep the address visible: a printed or flattened copy loses the link itself.
            const runs = inline(n.children, style);
            const label = runs.map((r) => r.text).join("");
            return label === n.url || `mailto:${label}` === n.url ? runs : [...runs, { text: ` (${n.url})`, ...style }];
        }
        if (n.type === "break") return [{ text: "\n", ...style }];
        if (n.type === "html") return [{ text: String(n.value).replace(/<[^>]+>/g, ""), ...style }];
        return n.children ? inline(n.children, style) : [];
    });

    const paragraph = (runs: Run[], size: number, indent = 0, lead = 1.45) => {
        const words = runs.flatMap((r) => r.text.split(/(\s+)/).filter(Boolean).map((text) => ({ ...r, text })));
        const lines: Run[][] = [[]];
        let lineWidth = 0;
        for (const word of words) {
            if (word.text.includes("\n")) { lines.push([]); lineWidth = 0; continue; }
            const isSpace = /^\s+$/.test(word.text);
            if (isSpace && lineWidth === 0) continue;
            const w = pick(word).widthOfTextAtSize(word.text, size);
            if (lineWidth + w > width - indent && lineWidth > 0) {
                lines.push([]); lineWidth = 0;
                if (isSpace) continue;
            }
            lines.at(-1)!.push(word);
            lineWidth += w;
        }
        for (const line of lines) {
            ensure(size * lead);
            y -= size * lead;
            let x = MARGIN + indent;
            for (const r of line) {
                page.drawText(r.text, { x, y, font: pick(r), size, color: INK });
                x += pick(r).widthOfTextAtSize(r.text, size);
            }
        }
    };

    const block = (n: any, indent = 0): void => {
        switch (n.type) {
            case "heading":
                y -= 8; paragraph(inline(n.children, { bold: true }), [0, 18, 15, 13][n.depth] ?? 12, indent); y -= 4; break;
            case "paragraph":
                paragraph(inline(n.children), 10.5, indent); y -= 6; break;
            case "list":
                n.children.forEach((item: any, i: number) => {
                    const marker = n.ordered ? `${(n.start ?? 1) + i}.` : "•";
                    const [first, ...rest] = item.children;
                    ensure(16);
                    const markerPage = page, markerY = y - 10.5 * 1.45;
                    if (first?.type === "paragraph") paragraph(inline(first.children), 10.5, indent + 16);
                    else if (first) block(first, indent + 16);
                    markerPage.drawText(marker, { x: MARGIN + indent + 2, y: markerY, font: fonts.regular, size: 10.5, color: INK });
                    rest.forEach((c: any) => block(c, indent + 16));
                });
                y -= 6; break;
            case "blockquote":
                n.children.forEach((c: any) => block(c, indent + 14)); break;
            case "table":
                for (const row of n.children) {
                    paragraph(row.children.flatMap((cell: any, i: number) =>
                        [...(i ? [{ text: "   |   " }] : []), ...inline(cell.children, { bold: row === n.children[0] })]), 10.5, indent);
                }
                y -= 6; break;
            case "thematicBreak":
                ensure(14); y -= 7;
                page.drawLine({ start: { x: MARGIN, y }, end: { x: MARGIN + width, y }, color: rgb(0.85, 0.85, 0.85), thickness: 0.75 });
                y -= 7; break;
            case "html":
                paragraph([{ text: String(n.value).replace(/<[^>]+>/g, " ") }], 10.5, indent); y -= 6; break;
            default:
                if (n.children) n.children.forEach((c: any) => block(c, indent));
                else if (n.value) paragraph([{ text: String(n.value) }], 10.5, indent);
        }
    };

    paragraph([{ text: title, bold: true }], 20);
    y -= 10;
    const tree = unified().use(remarkParse).use(remarkGfm).parse(markdown) as any;
    tree.children.forEach((n: any) => block(n));

    // Signature block, kept together on one page.
    ensure(110);
    y -= 28;
    const pageIndex = pdf.getPages().length - 1;
    const boxes: SigningBox[] = [
        { id: "signature", page: pageIndex, x: MARGIN, y: y - 56, width: 240, height: 56, source: "signing.signature", label: "Signature" },
        { id: "signer-name", page: pageIndex, x: MARGIN + 260, y: y - 22, width: width - 260, height: 22, source: "signing.signerName", label: "Printed name" },
        { id: "date-signed", page: pageIndex, x: MARGIN + 260, y: y - 56, width: width - 260, height: 22, source: "signing.date", label: "Date signed" },
    ];
    return boxes;
}

// ─── Uploaded templates: box detection ────────────────────────────────────────────────────────────────────────────

function guessSource(label: string): string {
    const l = label.toLowerCase();
    if (/sign/.test(l)) return "signing.signature";
    if (/date/.test(l) && !/birth/.test(l)) return "signing.date";
    if (/birth|dob/.test(l)) return "member.dob";
    if (/parent|guardian|signer|print/.test(l)) return "signing.signerName";
    if (/e-?mail/.test(l)) return "member.email";
    if (/contact/.test(l)) return "signing.text";
    if (/phone|tel/.test(l)) return "member.phone";
    if (/first name/.test(l)) return "member.firstName";
    if (/last name/.test(l)) return "member.lastName";
    if (/name/.test(l)) return "member.name";
    return "";
}

const overlaps = (a: TemplateField, b: TemplateField) => a.page === b.page &&
    a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;

/**
 * Suggests boxes for an uploaded PDF. Existing form fields are exact; on a flat PDF, labels such as "Name:" and runs
 * of underscores become suggestions the vendor confirms. A scanned PDF has no text, so it gets none.
 */
export async function detectTemplateFields(bytes: Uint8Array) {
    const pdf = await PDF.load(bytes);
    const pages = pdf.getPages();
    const found: TemplateField[] = [];
    const add = (f: Omit<TemplateField, "id">) => {
        const field = { ...f, id: `f${found.length + 1}` };
        if (field.width > 4 && field.height > 4 && !found.some((g) => overlaps(g, field))) found.push(field);
    };

    for (const field of pdf.getForm()?.getFields() ?? []) {
        if (field.type !== "text" && field.type !== "signature") continue;
        for (const widget of field.getWidgets()) {
            const ref = widget.pageRef;
            const page = pages.findIndex((p) => ref && p.ref.objectNumber === ref.objectNumber && p.ref.generation === ref.generation);
            if (page < 0) continue;
            const [x1, y1, x2, y2] = widget.rect;
            add({
                page, x: Math.min(x1, x2), y: Math.min(y1, y2), width: Math.abs(x2 - x1), height: Math.abs(y2 - y1),
                source: field.type === "signature" ? "signing.signature" : guessSource(field.name), label: field.name,
            });
        }
    }

    const labels = pdf.findText(/([a-z/]+ )?(signature|date|name|e-?mail|phone|birth|guardian|parent|contact)[a-z .()/'-]{0,24}:/gi);
    const lines = pdf.findText(/_{5,}/g);
    // Any "Something:" can name the underline after it, even when it suggests no source.
    const lineLabels = pdf.findText(/[a-z][a-z ,/'()-]{0,48}:/gi);
    const sameRow = (a: { pageIndex: number; bbox: { y: number } }, b: typeof a) => a.pageIndex === b.pageIndex && Math.abs(a.bbox.y - b.bbox.y) < 8;
    for (const line of lines) {
        // The nearest label to the left, unless another underline sits between them: that label is the other blank's.
        const label = lineLabels.filter((l) => sameRow(l, line) && l.bbox.x < line.bbox.x
            && !lines.some((o) => o !== line && sameRow(o, line) && o.bbox.x > l.bbox.x && o.bbox.x < line.bbox.x))
            .sort((a, b) => b.bbox.x - a.bbox.x)[0];
        const source = label ? guessSource(label.text) : "";
        // A signature sits on the line and rises above it, so its box is taller than a text box.
        add({
            page: line.pageIndex, x: line.bbox.x, y: line.bbox.y - 2, width: line.bbox.width,
            height: source === "signing.signature" ? 36 : Math.max(16, line.bbox.height + 4),
            source, label: label?.text.replace(/:$/, "") ?? undefined,
        });
    }
    for (const label of labels) {
        const pageWidth = pages[label.pageIndex]!.width;
        const x = label.bbox.x + label.bbox.width + 6;
        const source = guessSource(label.text);
        const height = source === "signing.signature" ? 36 : 18;
        // Top-aligned with the label, so a tall signature box grows downward instead of into the row above.
        add({
            page: label.pageIndex, x, y: label.bbox.y + label.bbox.height + 3 - height, width: Math.max(60, Math.min(220, pageWidth - MARGIN / 2 - x)),
            height, source, label: label.text.replace(/:$/, ""),
        });
    }

    return { pages: pages.map((p) => ({ width: p.width, height: p.height })), fields: found };
}

// ─── Unsigned PDF ─────────────────────────────────────────────────────────────────────────────────────────────────

/** Builds the PDF a member is shown: values filled in, empty boxes for what the signer adds. */
export async function buildUnsignedPdf(input: {
    title: string;
    content: string | null;
    fields: TemplateField[] | null;
    source: Uint8Array | null;
    variables: Record<string, unknown>;
}): Promise<Uint8Array> {
    const uploaded = Boolean(input.fields && input.source);
    const pdf = uploaded ? await PDF.load(input.source!) : PDF.create();
    // Bake in an uploaded PDF's own form so its empty fields can't be typed into or confused with ours.
    if (uploaded) pdf.getForm()?.flatten();
    const fonts = embedFonts(pdf);
    const pages = () => pdf.getPages();
    const boxes: SigningBox[] = [];
    if (uploaded) {
        for (const field of input.fields!) {
            const page = pages()[field.page];
            if (!page) continue;
            if (isSigningSource(field.source)) boxes.push(field as SigningBox);
            else drawFitted(page, fonts.regular, resolveVariable(input.variables, field.source), field);
        }
    } else {
        boxes.push(...layoutWritten(pdf, fonts, input.title, interpolateContract(input.content ?? "", input.variables)));
    }

    for (const box of boxes) {
        const page = pages()[box.page]!;
        drawBox(page, box);
        // An uploaded PDF already labels its own lines; only our written layout needs captions.
        if (box.label && !uploaded) page.drawText(box.label, { x: box.x, y: box.y - 10, font: fonts.regular, size: 7.5, color: MUTED });
    }
    pdf.addAttachment(FIELDS_ATTACHMENT, new TextEncoder().encode(JSON.stringify({ version: 1, boxes })), {
        mimeType: "application/json",
        description: "Boxes the signer fills",
    });
    return pdf.save({ subsetFonts: true });
}

/** The boxes a frozen unsigned PDF expects the signer to fill. */
export async function readSigningBoxes(unsigned: Uint8Array): Promise<SigningBox[]> {
    const pdf = await PDF.load(unsigned);
    const raw = pdf.getAttachment(FIELDS_ATTACHMENT);
    if (!raw) return [];
    return (JSON.parse(new TextDecoder().decode(raw)) as { boxes: SigningBox[] }).boxes;
}

// ─── Signed PDF ───────────────────────────────────────────────────────────────────────────────────────────────────

let sealSigner: Promise<P12Signer> | null = null;
function getSealSigner() {
    const path = process.env.DOC_SEAL_P12_PATH;
    if (!path) throw new Error("DOC_SEAL_P12_PATH is not set; documents cannot be sealed");
    sealSigner ??= P12Signer.create(new Uint8Array(readFileSync(path)), process.env.DOC_SEAL_P12_PASSWORD ?? "");
    return sealSigner;
}

export type SigningRecord = {
    documentId: string;
    documentTitle: string;
    locationName: string;
    signedFor: string;
    signerName: string;
    signedAt: Date;
    signedDate: string;
    ipAddress: string | null;
    userAgent: string | null;
    unsignedSha256: string;
};

/** Stamps the signer's values onto the frozen unsigned PDF, adds a certificate page and the audit record, and seals it. */
export async function sealSignedPdf(input: {
    unsigned: Uint8Array;
    signaturePng: Uint8Array | null;
    texts: Record<string, string>;
    record: SigningRecord;
}): Promise<Uint8Array> {
    const { record } = input;
    const boxes = await readSigningBoxes(input.unsigned);
    const pdf = await PDF.load(input.unsigned);
    const fonts = embedFonts(pdf);
    const pages = pdf.getPages();
    const signature = input.signaturePng ? pdf.embedImage(input.signaturePng) : null;

    for (const box of boxes) {
        const page = pages[box.page];
        if (!page) continue;
        if (box.source === "signing.signature") {
            if (!signature) continue;
            const scale = Math.min((box.width - 6) / signature.width, (box.height - 6) / signature.height);
            const w = signature.width * scale, h = signature.height * scale;
            page.drawImage(signature, { x: box.x + (box.width - w) / 2, y: box.y + (box.height - h) / 2, width: w, height: h });
        } else {
            const text = box.source === "signing.signerName" ? record.signerName
                : box.source === "signing.date" ? record.signedDate
                    : input.texts[box.id] ?? "";
            drawFitted(page, fonts.regular, text, box);
        }
    }

    const cert = pdf.addPage({ size: "letter" });
    let y = LETTER.height - MARGIN;
    const valueX = MARGIN + 150, valueWidth = LETTER.width - MARGIN - valueX;
    // Wraps at spaces, or mid-word for long unbroken values such as hashes.
    const wrap = (value: string) => {
        const out: string[] = [];
        let current = "";
        for (const ch of value) {
            if (fonts.regular.widthOfTextAtSize(current + ch, 9.5) <= valueWidth) { current += ch; continue; }
            const cut = current.lastIndexOf(" ");
            if (cut > 0) { out.push(current.slice(0, cut)); current = current.slice(cut + 1) + ch; }
            else { out.push(current); current = ch; }
        }
        return [...out, current];
    };
    const line = (label: string, value: string) => {
        cert.drawText(label, { x: MARGIN, y, font: fonts.bold, size: 9.5, color: MUTED });
        for (const [i, text] of wrap(value).entries()) {
            cert.drawText(text, { x: valueX, y: y - i * 13, font: fonts.regular, size: 9.5, color: INK });
        }
        y -= wrap(value).length * 13 + 8;
    };
    cert.drawText("Signing certificate", { x: MARGIN, y, font: fonts.bold, size: 18, color: INK });
    y -= 34;
    line("Document", record.documentTitle);
    line("Document ID", record.documentId);
    line("Location", record.locationName);
    line("Signed for", record.signedFor);
    line("Signed by", record.signerName);
    line("Signed at", record.signedAt.toISOString().replace("T", " ").replace(/\.\d+Z$/, " UTC"));
    line("IP address", record.ipAddress ?? "Not recorded");
    line("Device", record.userAgent ?? "Not recorded");
    line("Unsigned PDF SHA-256", record.unsignedSha256);
    if (signature) {
        const h = 50, w = Math.min(220, signature.width * (h / signature.height));
        cert.drawText("Signature as drawn", { x: MARGIN, y, font: fonts.bold, size: 9.5, color: MUTED });
        cert.drawImage(signature, { x: MARGIN + 150, y: y - h + 10, width: w, height: h });
        y -= h + 14;
    }
    cert.drawText("This file is sealed by Monstro. Any change to it breaks the seal.", { x: MARGIN, y: MARGIN, font: fonts.italic, size: 8.5, color: MUTED });

    pdf.addAttachment("audit.json", new TextEncoder().encode(JSON.stringify({ ...record, signedAt: record.signedAt.toISOString() }, null, 2)), {
        mimeType: "application/json",
        description: "Signing audit record",
    });
    if (input.signaturePng) {
        pdf.addAttachment("signature.png", input.signaturePng, { mimeType: "image/png", description: "Signature as drawn" });
    }

    const stamped = await PDF.load(await pdf.save({ subsetFonts: true }));
    const { bytes } = await stamped.sign({
        signer: await getSealSigner(),
        reason: "Signed through Monstro",
        location: record.locationName,
        signingTime: record.signedAt,
        fieldName: "monstro_seal",
    });
    return bytes;
}
