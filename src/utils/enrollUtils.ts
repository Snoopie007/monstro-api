import type { AdditionalFee, ChargeDetails, InvoiceItem } from "@subtrees/types";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { db } from "@/db/db";
import { memberContracts } from "@subtrees/schemas";

type EnrollTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Creates plan contract and location waiver rows for an enrollment; returns IDs still needing a signature. */
export async function createEnrollUnsignedDocs(
	tx: EnrollTx,
	input: {
		mid: string;
		lid: string;
		memberPlanId: string;
		contractId?: string | null;
		waiverId?: string | null;
		signedWaiverId?: string | null;
	},
): Promise<string[]> {
	const { mid, lid, memberPlanId, contractId, waiverId, signedWaiverId } = input;
	const unsignedDocs: string[] = [];

	if (contractId) {
		const [c] = await tx.insert(memberContracts).values({
			memberId: mid,
			templateId: contractId,
			locationId: lid,
			memberPlanId,
		}).returning({
			id: memberContracts.id,
		});
		if (c) {
			unsignedDocs.push(c.id);
		}
	}

	if (waiverId && !signedWaiverId) {
		const [w] = await tx.insert(memberContracts).values({
			memberId: mid,
			templateId: waiverId,
			locationId: lid,
			memberPlanId,
		}).returning({
			id: memberContracts.id,
		});
		if (w) {
			unsignedDocs.push(w.id);
		}
	}

	return unsignedDocs;
}

/** Recovers pending enrollment documents after a paid transaction replay without duplicating existing rows. */
export async function recoverEnrollUnsignedDocs(input: {
    mid: string;
    lid: string;
    memberPlanId: string;
    contractId?: string | null;
    waiverId?: string | null;
}): Promise<string[]> {
    const templateIds = [input.contractId, input.waiverId]
        .filter((id): id is string => Boolean(id));
    if (templateIds.length === 0) return [];

    const existing = await db.query.memberContracts.findMany({
        where: (doc, { and, eq }) => and(
            eq(doc.memberId, input.mid),
            eq(doc.locationId, input.lid),
            eq(doc.memberPlanId, input.memberPlanId),
        ),
        columns: {
            id: true,
            templateId: true,
            signedOn: true,
        },
    });
    const unsignedDocs: string[] = [];
    for (const templateId of templateIds) {
        const docs = existing.filter((doc) => doc.templateId === templateId);
        if (docs.some((doc) => doc.signedOn)) continue;
        const pending = docs.filter((doc) => !doc.signedOn);
        if (pending.length > 0) {
            unsignedDocs.push(...pending.map((doc) => doc.id));
            continue;
        }
        const [created] = await db.insert(memberContracts).values({
            memberId: input.mid,
            templateId,
            locationId: input.lid,
            memberPlanId: input.memberPlanId,
        }).returning({ id: memberContracts.id });
        if (created) unsignedDocs.push(created.id);
    }
    return unsignedDocs;
}

export type CalculateChargeDetailsProps = {
	amount: number;
	discount?: number;
	taxRate: number;
	taxAmount?: number;
	usagePercent: number;
	platformFeeBase?: number;
	additionalFees: Array<Pick<AdditionalFee, "id" | "label" | "type" | "amount">>;
};

export function calculateChargeDetails(
	props: CalculateChargeDetailsProps,
): ChargeDetails {
	const {
		amount,
		discount,
		taxRate,
		taxAmount,
		usagePercent,
		platformFeeBase,
		additionalFees,
	} = props;

	const subTotal = Math.max(0, amount - (discount || 0));
	const tax = taxAmount ?? Math.floor((subTotal * (taxRate || 0)) / 100);

	// Monstro's platform fee is vendor-side and never part of the member total.
	const platformBase = platformFeeBase ?? subTotal + tax;
	const feesAmount = usagePercent > 0
		? Math.floor((platformBase * usagePercent) / 100)
		: 0;

	const additionalFeeLines: InvoiceItem[] = [];
	let additionalFeeTotal = 0;
	for (const fee of additionalFees) {
		const lineAmount = fee.type === "fixed"
			? fee.amount
			: Math.floor((subTotal * fee.amount) / 10000);
		if (lineAmount <= 0) continue;

		additionalFeeTotal += lineAmount;
		additionalFeeLines.push({
			kind: "additional_fee",
			sourceFeeId: fee.id,
			name: fee.label,
			quantity: 1,
			price: lineAmount,
		});
	}

	const total = subTotal + tax + additionalFeeTotal;

	return {
		total,
		subTotal,
		unitCost: subTotal,
		tax,
		feesAmount,
		additionalFeeTotal,
		additionalFeeLines,
	};
}

export interface ThresholdDateParams {
	startDate: Date;
	threshold: number;
	interval: "day" | "week" | "month" | "year";
}

export function calculateThresholdDate({
	startDate,
	threshold,
	interval,
}: ThresholdDateParams) {
	switch (interval) {
		case "day":
			return addDays(startDate, threshold);
		case "week":
			return addWeeks(startDate, threshold);
		case "month":
			return addMonths(startDate, threshold);
		case "year":
			return addYears(startDate, threshold);
		default:
			return startDate;
	}
}
