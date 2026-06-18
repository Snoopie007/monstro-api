import { db } from "@/db/db";
import { memberContracts } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { generatePDFBuffer } from "@/libs/PDFGenerator";
import S3Bucket from "@/libs/s3";

const s3 = new S3Bucket();

interface GeneratePDFProps {
    did: string;
    mid: string;
    lid: string;
    title: string;
    content: string;
}

export async function generatePDF({
    did,
    mid,
    lid,
    title,
    content,
}: GeneratePDFProps) {
    try {
        const pdfBuffer = await generatePDFBuffer(title, content);
        const filename = `${title.toLowerCase().replace(/ /g, "-")}-${Date.now()}.pdf`;

        await s3.uploadBuffer(
            pdfBuffer,
            `members/${mid}/locations/${lid}/docs/${filename}`,
            "application/pdf",
        );

        await db.update(memberContracts).set({ pdfFilename: filename })
            .where(eq(memberContracts.id, did));
    } catch (error) {
        console.error("Background PDF generation failed:", error);
    }
}
