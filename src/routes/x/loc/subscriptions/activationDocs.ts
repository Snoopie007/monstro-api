import { db } from "@/db/db";
import { EmailSender } from "@/libs/email";
import { recoverEnrollUnsignedDocs } from "@/utils/enrollUtils";

/** Gives a staff-activated subscription the documents self-enrollment creates (location waiver and plan contract) and
 * emails a signing request for each. Runs after the activation commits and only logs failures, so it never undoes one. */
export async function createActivationDocs(sub: {
    id: string;
    memberId: string;
    locationId: string;
    pricing: { plan: { contractId: string | null } } | null;
}) {
    const docIds = await recoverEnrollUnsignedDocs({
        mid: sub.memberId,
        lid: sub.locationId,
        memberPlanId: sub.id,
        contractId: sub.pricing?.plan.contractId,
    }).catch((error): string[] => {
        console.error(`[subscriptions] Failed to create documents for ${sub.id}`, error);
        return [];
    });
    if (docIds.length === 0) return;

    db.query.memberContracts.findMany({
        where: (doc, { inArray }) => inArray(doc.id, docIds),
        with: {
            contractTemplate: { columns: { type: true, requireSignature: true } },
            member: { columns: { id: true, firstName: true, email: true } },
            location: { columns: { id: true, name: true, address: true, email: true, phone: true } },
        },
    }).then((docs) => Promise.all(docs.map((doc) => {
        const docType = doc.contractTemplate.type === "waiver" ? "Waiver" : "Agreement";
        const action = doc.contractTemplate.requireSignature ? "sign" : "review";
        return new EmailSender().sendWithTemplate({
            template: "DocRequestEmail",
            options: { to: doc.member.email, subject: `Please ${action} your ${docType.toLowerCase()} for ${doc.location.name}` },
            data: {
                member: doc.member,
                location: doc.location,
                docId: doc.id,
                docType,
                requireSignature: doc.contractTemplate.requireSignature,
            },
        });
    }))).catch((error) => console.error("Error sending document requests:", error));
}
