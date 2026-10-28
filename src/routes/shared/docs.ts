import { and, eq, sql } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db/db";
import { locationState, memberContracts, memberLocations } from "@/subtrees/schemas";
import { generatePDF } from "@/utils/generatePDF";
import { renderContractContent } from "@/utils/contractUtils";

export class MemberDocumentError extends Error {
    constructor(public status: 400 | 404 | 409, message: string) {
        super(message);
    }
}

type DocTx = Parameters<Parameters<typeof db.transaction>[0]>[0];
type PersonName = { firstName: string; lastName: string | null };

const fullName = (person: PersonName) => `${person.firstName} ${person.lastName ?? ""}`.trim();

/** The member's name, or "Parent for Child" when the document belongs to a family plan child's membership. */
export async function getSignerName(tx: DocTx, doc: { memberId: string; memberPlanId: string | null; member: PersonName }) {
    const memberName = fullName(doc.member);
    if (!doc.memberPlanId) return memberName;
    const [parent] = await tx.execute(sql`
        select p.first_name, p.last_name from (
            select r.member_id from member_subscriptions k join member_subscriptions r on r.id = k.parent_id
            where k.id = ${doc.memberPlanId} and k.member_id = ${doc.memberId}
            union all
            select r.member_id from member_packages k join member_packages r on r.id = k.parent_id
            where k.id = ${doc.memberPlanId} and k.member_id = ${doc.memberId}
        ) family join members p on p.id = family.member_id
        limit 1`) as unknown as { first_name: string; last_name: string | null }[];
    return parent ? `${fullName({ firstName: parent.first_name, lastName: parent.last_name })} for ${memberName}` : memberName;
}

export async function getDoc(docId: string) {
    const doc = await db.query.memberContracts.findFirst({
        where: (m, { eq }) => eq(m.id, docId),
        with: {
            contractTemplate: true,
            member: true,
            location: true,
            pricing: { with: { plan: true } },
        },
    });
    if (!doc?.contractTemplate) {
        throw new MemberDocumentError(404, "Contract not found");
    }
    const { contractTemplate, member, location, pricing, ...rest } = doc;
    return {
        ...rest,
        mdx: renderContractContent(contractTemplate.content, {
            location,
            member,
            pricing,
        }),
    };
}

export async function signDoc(input: {
    docId: string;
    signature?: string | null;
    userAgent?: string | null;
    ipAddress?: string | null;
    mid?: string;
    lid?: string;
}) {
    const { docId, signature, userAgent, ipAddress } = input;

    await db.transaction(async (tx) => {
        const doc = await tx.query.memberContracts.findFirst({
            where: (m, { eq, and }) => and(
                eq(m.id, docId),
                ...(input.mid ? [eq(m.memberId, input.mid)] : []),
                ...(input.lid ? [eq(m.locationId, input.lid)] : []),
            ),
            with: {
                contractTemplate: true,
                location: true,
                member: true,
                pricing: { with: { plan: true } },
            },
        });
        if (!doc?.contractTemplate) {
            throw new MemberDocumentError(404, "Contract not found");
        }

        const mid = doc.memberId;
        const lid = doc.locationId;
        const template = doc.contractTemplate;
        const docScope = and(
            eq(memberContracts.id, docId),
            eq(memberContracts.memberId, mid),
            eq(memberContracts.locationId, lid),
        );
        const memberScope = and(
            eq(memberLocations.memberId, mid),
            eq(memberLocations.locationId, lid),
        );

        const [state] = await tx.select({ waiverId: locationState.waiverId }).from(locationState)
            .where(eq(locationState.locationId, lid)).for("share");
        if (!state) throw new MemberDocumentError(404, "Location not found");

        const [memberLocation] = await tx.select({ signedWaiverId: memberLocations.signedWaiverId })
            .from(memberLocations).where(memberScope).for("update");
        if (!memberLocation) throw new MemberDocumentError(404, "Member location not found");

        const newlySigned = !doc.signedOn;
        if (template.requireSignature) {
            const signatureText = newlySigned ? signature : doc.signature;
            if (!signatureText?.trim()) {
                if (newlySigned) {
                    throw new MemberDocumentError(400, "A signature is required to accept this document");
                }
                throw new MemberDocumentError(
                    409,
                    "This acceptance is missing its required signature. Contact the location to resolve this document.",
                );
            }
        }

        if (newlySigned) {
            const today = new Date();
            await tx.update(memberContracts).set({
                signature: signature?.trim() ? signature : null,
                signedOn: today,
                updated: today,
                userAgent: userAgent ?? undefined,
                ipAddress: ipAddress ?? undefined,
            }).where(docScope);

            if (template.type === "waiver" && state.waiverId === doc.templateId && memberLocation.signedWaiverId !== doc.id) {
                await tx.update(memberLocations).set({
                    signedWaiverId: doc.id,
                    updated: today,
                }).where(memberScope);
            }

            const signerName = await getSignerName(tx, doc);
            setTimeout(() => {
                generatePDF({
                    did: docId,
                    mid,
                    lid,
                    title: template.title,
                    content: renderContractContent(template.content, {
                        location: doc.location,
                        member: doc.member,
                        pricing: doc.pricing,
                    }),
                    signature: {
                        image: signature?.trim() ? signature : null,
                        name: signerName,
                        signedOn: formatInTimeZone(today, doc.location.timezone, "MMMM d, yyyy"),
                    },
                });
            }, 1000);
        }
    });
}
