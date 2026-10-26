import { db } from "@/db/db";
import { EmailSender } from "@/libs/email";
import { memberContracts } from "@/subtrees/schemas";
import type { ChargeDetails } from "@/subtrees/types";
import { inArray } from "drizzle-orm";

/**
 * DocRequestEmail links to the member portal signing page, which doesn't exist yet.
 * Turn this on once that page ships and the template builds its link from `docId`.
 */
export const DOC_REQUEST_EMAILS_ENABLED = false;

type EmailMember = {
    id: string;
    firstName: string;
    lastName?: string | null;
    email: string;
};

type EmailLocation = {
    id: string;
    name: string;
    address?: string | null;
    email?: string | null;
    phone?: string | null;
};

type EmailDoc = {
    id: string;
    contractTemplate: { type: "contract" | "waiver"; requireSignature: boolean };
    member: EmailMember;
    location: EmailLocation;
};

export type EnrollEmailInput = {
    member: EmailMember;
    location: EmailLocation;
    planType: "subscription" | "package";
    planName: string;
    invoiceId: string;
    paidDate: Date;
    charge: ChargeDetails;
};

function locationData({ id, name, address, email, phone }: EmailLocation) {
    return { id, name, address, email, phone };
}

/** The templates only know Agreement and Waiver. */
function docType(type: "contract" | "waiver") {
    return type === "waiver" ? "Waiver" : "Agreement";
}

/** "Adult Unlimited - Monthly"; just the plan name when the pricing repeats it. */
export function enrollPlanName(planName: string, pricingName: string) {
    return !pricingName || pricingName === planName ? planName : `${planName} - ${pricingName}`;
}

/**
 * Fees are shown before the discount, like the plan price, so
 * subtotal + fees - discount + tax adds up to the total.
 */
export function enrollReceipt(invoiceId: string, paidDate: Date, charge: ChargeDetails) {
    return {
        id: invoiceId,
        paidDate: paidDate.toISOString(),
        subtotal: charge.unitCost,
        discount: charge.discount,
        fees: charge.additionalFeeLines.reduce((sum, line) => sum + line.price, 0),
        tax: charge.tax,
        total: charge.total,
    };
}

/** Sends the enrollment receipt. Never throws: the payment is already saved. */
export async function sendEnrollEmail(input: EnrollEmailInput) {
    const { member, location, planType, planName, invoiceId, paidDate, charge } = input;
    try {
        await new EmailSender().sendWithTemplate({
            template: "EnrollEmail",
            options: { to: member.email, subject: `Your enrollment at ${location.name} is confirmed` },
            data: {
                member: { firstName: member.firstName, lastName: member.lastName },
                location: locationData(location),
                planType,
                planName,
                receipt: enrollReceipt(invoiceId, paidDate, charge),
            },
        });
    } catch (error) {
        console.error(`[member-email] Failed to send enrollment receipt for invoice ${invoiceId}`, error);
    }
}

/** Asks the member to sign each new enrollment document. Never throws. */
export async function sendDocRequestEmails(docIds: string[]) {
    if (!DOC_REQUEST_EMAILS_ENABLED || docIds.length === 0) return;
    try {
        const docs = await db.query.memberContracts.findMany({
            where: inArray(memberContracts.id, docIds),
            with: { contractTemplate: true, member: true, location: true },
        });
        for (const doc of docs) await sendDocRequestEmail(doc);
    } catch (error) {
        console.error("[member-email] Failed to load docs for signing requests", docIds, error);
    }
}

/** Never throws, so one failed send doesn't stop the rest. */
export async function sendDocRequestEmail(doc: EmailDoc) {
    const type = docType(doc.contractTemplate.type);
    const action = doc.contractTemplate.requireSignature ? "sign" : "review";
    try {
        await new EmailSender().sendWithTemplate({
            template: "DocRequestEmail",
            options: { to: doc.member.email, subject: `Please ${action} your ${type.toLowerCase()} for ${doc.location.name}` },
            data: {
                member: { id: doc.member.id, firstName: doc.member.firstName },
                docId: doc.id,
                docType: type,
                requireSignature: doc.contractTemplate.requireSignature,
                location: locationData(doc.location),
            },
        });
    } catch (error) {
        console.error(`[member-email] Failed to send signing request for doc ${doc.id}`, error);
    }
}

/** Confirms a newly signed document. Never throws: the signature is already saved. */
export async function sendDocSignedEmail(doc: EmailDoc) {
    const type = docType(doc.contractTemplate.type);
    try {
        await new EmailSender().sendWithTemplate({
            template: "DocSignedEmail",
            options: { to: doc.member.email, subject: `Your ${type.toLowerCase()} for ${doc.location.name} is signed` },
            data: {
                member: { id: doc.member.id, firstName: doc.member.firstName },
                docType: type,
                location: locationData(doc.location),
            },
        });
    } catch (error) {
        console.error(`[member-email] Failed to send signed confirmation for doc ${doc.id}`, error);
    }
}
