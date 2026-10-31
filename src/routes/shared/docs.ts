import { and, eq, isNull } from "drizzle-orm";
import { formatInTimeZone } from "date-fns-tz";
import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { buildUnsignedPdf, readSigningBoxes, sealSignedPdf, sha256Hex } from "@/libs/documentPdf";
import { locationState, memberContracts, memberLocations } from "@/subtrees/schemas";
import { buildContractVariables, renderContractContent } from "@/utils/contractUtils";
import { notifyDocumentSigned } from "@/utils/documentSignedNotification";

export class MemberDocumentError extends Error {
    constructor(public status: 400 | 404 | 409, message: string) {
        super(message);
    }
}

/** The name printed under a signature: the document's member. Who actually signed for a child is not recorded. */
export const getSignerName = (member: { firstName: string; lastName: string | null }) => `${member.firstName} ${member.lastName ?? ""}`.trim();

const docKey = (memberId: string, lid: string, filename: string) => `members/${memberId}/locations/${lid}/docs/${filename}`;
export const templateSourceKey = (lid: string, cid: string) => `locations/${lid}/contracts/${cid}/source.pdf`;

export async function readStoredFile(key: string): Promise<Uint8Array | null> {
    const url = await new S3Bucket().getSignedUrl(key, 60);
    if (!url) return null;
    const response = await fetch(url);
    return response.ok ? new Uint8Array(await response.arrayBuffer()) : null;
}

const loadDocForPdf = (docId: string) => db.query.memberContracts.findFirst({
    where: (m, { eq }) => eq(m.id, docId),
    with: { contractTemplate: true, member: true, location: true, pricing: { with: { plan: true } } },
});

/**
 * The unsigned PDF a member is shown. Built the first time the document is opened and then frozen: later template
 * edits don't change it. The file name carries its hash, so a concurrent first open can't overwrite the winner.
 */
export async function ensureUnsignedPdf(docId: string): Promise<{ bytes: Uint8Array; sha256: string }> {
    const doc = await loadDocForPdf(docId);
    if (!doc?.contractTemplate) throw new MemberDocumentError(404, "Contract not found");
    const unsignedKey = (sha: string) => docKey(doc.memberId, doc.locationId, `${doc.id}-unsigned-${sha.slice(0, 16)}.pdf`);

    if (doc.unsignedSha256) {
        const bytes = await readStoredFile(unsignedKey(doc.unsignedSha256));
        if (!bytes || sha256Hex(bytes) !== doc.unsignedSha256) throw new Error(`Frozen PDF for ${doc.id} is missing or altered`);
        return { bytes, sha256: doc.unsignedSha256 };
    }

    const template = doc.contractTemplate;
    const source = template.fields ? await readStoredFile(templateSourceKey(template.locationId, template.id)) : null;
    if (template.fields && !source) throw new Error(`Template ${template.id} has boxes but no uploaded PDF`);
    const bytes = await buildUnsignedPdf({
        title: template.title,
        content: template.content,
        fields: template.fields,
        source,
        variables: buildContractVariables({ location: doc.location, member: doc.member, pricing: doc.pricing }),
    });
    const sha256 = sha256Hex(bytes);
    await new S3Bucket().uploadBuffer(bytes, unsignedKey(sha256), "application/pdf");
    const [claimed] = await db.update(memberContracts).set({ unsignedSha256: sha256 })
        .where(and(eq(memberContracts.id, doc.id), isNull(memberContracts.unsignedSha256)))
        .returning({ id: memberContracts.id });
    return claimed ? { bytes, sha256 } : ensureUnsignedPdf(docId);
}

/** The PDF for a document: the sealed file once signed, otherwise the frozen unsigned copy. Null for an old signed
 * document whose file was never stored. */
export async function getDocPdf(docId: string): Promise<Uint8Array | null> {
    const doc = await db.query.memberContracts.findFirst({ where: (m, { eq }) => eq(m.id, docId) });
    if (!doc) throw new MemberDocumentError(404, "Contract not found");
    if (doc.signedOn) return doc.pdfFilename ? readStoredFile(docKey(doc.memberId, doc.locationId, doc.pdfFilename)) : null;
    return (await ensureUnsignedPdf(docId)).bytes;
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
    const unsigned = doc.signedOn ? null : await ensureUnsignedPdf(docId);
    return {
        ...rest,
        contractTemplate: { title: contractTemplate.title, type: contractTemplate.type, requireSignature: contractTemplate.requireSignature },
        unsignedSha256: unsigned?.sha256 ?? rest.unsignedSha256,
        // What the signer fills and where, so the signing screen can ask for it and preview it on the PDF.
        signingBoxes: unsigned ? await readSigningBoxes(unsigned.bytes) : [],
        // The date stamped if they sign now: the location's day, not the signer's.
        signingDate: formatInTimeZone(new Date(), location.timezone, "MMMM d, yyyy"),
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
    /** Name typed by whoever signs; defaults to the document's member. */
    signerName?: string | null;
    /** Values for the template's "typed at signing" boxes, by box id. */
    texts?: Record<string, string> | null;
    /** SHA-256 of the PDF the signer was shown; must match the frozen copy. */
    sha256?: string | null;
}) {
    const { docId, signature, userAgent, ipAddress } = input;
    const signedAt = new Date();

    // Stamp and seal before saving anything: if this fails, nothing is recorded and the signer can retry.
    const pending = await loadDocForPdf(docId);
    if (!pending?.contractTemplate || (input.mid && pending.memberId !== input.mid) || (input.lid && pending.locationId !== input.lid)) {
        throw new MemberDocumentError(404, "Contract not found");
    }
    let sealedFilename: string | null = null;
    if (!pending.signedOn) {
        const unsigned = await ensureUnsignedPdf(docId);
        if (input.sha256 && input.sha256 !== unsigned.sha256) {
            throw new MemberDocumentError(409, "This document changed since it was opened. Reload it and sign again.");
        }
        const boxes = await readSigningBoxes(unsigned.bytes);
        const texts = input.texts ?? {};
        const missing = boxes.filter((b) => b.source === "signing.text" && !texts[b.id]?.trim());
        if (missing.length) throw new MemberDocumentError(400, `Fill in: ${missing.map((b) => b.label ?? b.id).join(", ")}`);
        const signerName = input.signerName?.trim() || getSignerName(pending.member);
        if (pending.contractTemplate.requireSignature && !signature?.trim()) {
            throw new MemberDocumentError(400, "A signature is required to accept this document");
        }
        const sealed = await sealSignedPdf({
            unsigned: unsigned.bytes,
            signaturePng: signature?.trim() ? new Uint8Array(Buffer.from(signature, "base64")) : null,
            texts,
            record: {
                documentId: pending.id,
                documentTitle: pending.contractTemplate.title,
                locationName: pending.location.name,
                signedFor: getSignerName(pending.member),
                signerName,
                signedAt,
                signedDate: formatInTimeZone(signedAt, pending.location.timezone, "MMMM d, yyyy"),
                ipAddress: ipAddress ?? null,
                userAgent: userAgent ?? null,
                unsignedSha256: unsigned.sha256,
            },
        });
        sealedFilename = `${pending.id}-signed-${signedAt.getTime()}.pdf`;
        await new S3Bucket().uploadBuffer(sealed, docKey(pending.memberId, pending.locationId, sealedFilename), "application/pdf");
    }

    const signed = await db.transaction(async (tx) => {
        const doc = await tx.query.memberContracts.findFirst({
            where: (m, { eq, and }) => and(
                eq(m.id, docId),
                ...(input.mid ? [eq(m.memberId, input.mid)] : []),
                ...(input.lid ? [eq(m.locationId, input.lid)] : []),
            ),
            with: {
                contractTemplate: true,
                location: { with: { vendor: { with: { user: true } } } },
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
            const today = signedAt;
            await tx.update(memberContracts).set({
                signature: signature?.trim() ? signature : null,
                signedOn: today,
                updated: today,
                userAgent: userAgent ?? undefined,
                ipAddress: ipAddress ?? undefined,
                pdfFilename: sealedFilename,
            }).where(docScope);

            if (template.type === "waiver" && state.waiverId === doc.templateId && memberLocation.signedWaiverId !== doc.id) {
                await tx.update(memberLocations).set({
                    signedWaiverId: doc.id,
                    updated: today,
                }).where(memberScope);
            }

            return { doc, template };
        }
        return null;
    });

    // After the commit, so a rolled-back signing never notifies; not awaited, so a slow or failed notification doesn't hold up the signing.
    if (signed) {
        const { doc, template } = signed;
        void notifyDocumentSigned({
            docId,
            memberId: doc.memberId,
            memberName: getSignerName(doc.member),
            documentTitle: template.title,
            locationId: doc.locationId,
            locationName: doc.location.name,
            vendorUser: doc.location.vendor?.user,
        });
    }
}
