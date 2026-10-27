import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { EmailSender } from "@/libs/email";
import { locationState, memberContracts, memberLocations } from "@/subtrees/schemas";

export class MemberDocumentError extends Error {
    constructor(public status: 400 | 404 | 409, message: string) {
        super(message);
    }
}

export async function signMemberDocument(input: { mid: string; lid: string; did: string; signature?: string }) {
    const { mid, lid, did, signature } = input;
    const result = await db.transaction(async (tx) => {
        const [state] = await tx.select({ waiverId: locationState.waiverId }).from(locationState)
            .where(eq(locationState.locationId, lid)).for("share");
        if (!state) throw new MemberDocumentError(404, "Location not found");
        const memberScope = and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid));
        const [memberLocation] = await tx.select({ signedWaiverId: memberLocations.signedWaiverId })
            .from(memberLocations).where(memberScope).for("update");
        if (!memberLocation) throw new MemberDocumentError(404, "Member location not found");
        const docScope = and(eq(memberContracts.id, did), eq(memberContracts.memberId, mid), eq(memberContracts.locationId, lid));
        const [locked] = await tx.select({ id: memberContracts.id }).from(memberContracts).where(docScope).for("update");
        if (!locked) throw new MemberDocumentError(404, "Member contract not found");
        const doc = await tx.query.memberContracts.findFirst({
            where: docScope,
            with: {
                contractTemplate: true,
                location: true,
                member: true,
                pricing: { with: { plan: true } },
            },
        });
        if (!doc || doc.contractTemplate?.locationId !== lid || (doc.pricing && doc.pricing.plan?.locationId !== lid)) {
            throw new MemberDocumentError(404, "Member contract not found");
        }
        const template = doc.contractTemplate;
        const newlySigned = !doc.signedOn;
        if (template.requireSignature && !(newlySigned ? signature : doc.signature)?.trim()) {
            throw new MemberDocumentError(newlySigned ? 400 : 409, newlySigned
                ? "A signature is required to accept this document"
                : "This acceptance is missing its required signature. Contact the location to resolve this document.");
        }
        if (newlySigned) {
            const signedOn = new Date();
            await tx.update(memberContracts).set({ signature: signature?.trim() ? signature : null, signedOn, updated: signedOn }).where(docScope);
        }
        if (template.type === "waiver" && state.waiverId === doc.templateId && memberLocation.signedWaiverId !== doc.id) {
            await tx.update(memberLocations).set({ signedWaiverId: doc.id, updated: new Date() }).where(memberScope);
        }
        return { doc, newlySigned };
    });
    if (result.newlySigned) {
        const { doc } = result;
        const docType = doc.contractTemplate.type === "waiver" ? "Waiver" : "Agreement";
        // The signature is saved, so a failed email only gets logged.
        new EmailSender().sendWithTemplate({
            template: "DocSignedEmail",
            options: { to: doc.member.email, subject: `Your ${docType.toLowerCase()} for ${doc.location.name} is signed` },
            data: { member: doc.member, location: doc.location, docType },
        }).catch((error) => console.error("Error sending document signed email:", error));
    }
    return result;
}
