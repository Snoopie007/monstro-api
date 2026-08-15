import type { PaymentType, ChargeDetails } from "@subtrees/types";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { db } from "@/db/db";
import { memberContracts } from "@subtrees/schemas";

const GATEWAY_BILLING_FEE = 0.7;
const GATEWAY_FEE_PERCENT = 2.9;
const GATEWAY_FEE_AMOUNT = 30;
const GATEWAY_BANK_FEE = 0.8;

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

export function calculateGatewayFeeAmount(
	amount: number,
	paymentType: PaymentType,
	isRecurring?: boolean,
): number {
	if (amount <= 0) return 0;

	if (paymentType === "us_bank_account") {
		return Math.ceil(amount * (GATEWAY_BANK_FEE / 100));
	}

	const percentage = isRecurring
		? GATEWAY_BILLING_FEE + GATEWAY_FEE_PERCENT
		: GATEWAY_FEE_PERCENT;

	const fees = Math.ceil(amount * (percentage / 100)) + GATEWAY_FEE_AMOUNT;
	const feeOnStripeFees = Math.ceil(fees * (percentage / 100));

	return fees + feeOnStripeFees;
}

export type CalculateChargeDetailsProps = {
	amount: number;
	discount?: number;
	taxRate: number;
	usagePercent: number;
	paymentType: PaymentType;
	isRecurring: boolean;
	passOnFees: boolean;
};

export function calculateChargeDetails(
	props: CalculateChargeDetailsProps,
): ChargeDetails {
	const {
		amount,
		discount,
		taxRate,
		usagePercent,
		paymentType,
		isRecurring,
		passOnFees,
	} = props;

	let price = Math.max(0, amount - (discount || 0));

	const tax = Math.floor((price * (taxRate || 0)) / 100);

	let total = price + tax;

	let feesAmount = 0;
	if (usagePercent > 0) {
		feesAmount = Math.floor((total * usagePercent) / 100);
	}
	const gatewayFee = calculateGatewayFeeAmount(
		total,
		paymentType,
		isRecurring || false,
	);

	if (passOnFees) {
		const fees = feesAmount + gatewayFee;
		total += fees;
		price += fees;
	}

	return {
		total,
		subTotal: price,
		unitCost: price,
		tax,
		feesAmount: feesAmount,
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
