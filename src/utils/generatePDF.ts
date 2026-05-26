import type { Contract } from "@subtrees/types/contract";
import type { MemberPlanPricing } from "@subtrees/types";
import { db } from "@/db/db";
import { memberContracts } from "@subtrees/schemas";
import { eq } from "drizzle-orm";
import { generatePDFBuffer } from "@/libs/PDFGenerator";
import S3Bucket from "@/libs/s3";

const s3 = new S3Bucket();

interface GeneratePDFProps {
    memberContractId: string;
    member: {
        id: string;
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
    };
    template: Contract;
    pricing: MemberPlanPricing | undefined;
}

export async function generatePDF({ memberContractId, member, template, pricing }: GeneratePDFProps) {
    try {
        console.log("Generating PDF for member contract:", memberContractId);
        const location = template.location;

        const variables: Record<string, any> = {
            location,
            member: {
                ...member,
                name: member?.firstName + " " + member?.lastName,
            },
        };
        if (pricing) {
            variables["plan"] = {
                name: pricing?.plan?.name,
                price: pricing?.price,
                interval: `${pricing?.interval} ${pricing?.intervalThreshold}`,
                pricingName: pricing?.name,
            };
        }

        const pdfBuffer = await generatePDFBuffer(template, variables);
        const filename = `${template.title.toLowerCase().replace(/ /g, "-")}-${new Date().getTime()}.pdf`;

        await s3.uploadBuffer(
            pdfBuffer,
            `members/${member.id}/locations/${location?.id}/docs/${filename}`,
            "application/pdf"
        );

        await db.update(memberContracts).set({ pdfFilename: filename })
            .where(eq(memberContracts.id, memberContractId));
    } catch (error) {
        console.error("Background PDF generation failed:", error);
    }

}


