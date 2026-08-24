import type { AdditionalFee, ChargeDetails, CheckoutDiscount, InvoiceItem } from "@subtrees/types";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { db } from "@/db/db";
import { memberContracts } from "@subtrees/schemas";
import { getMonstroPlatformFeePercent } from "@subtrees/utils";

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
	discount?: CheckoutDiscount | number;
	taxRate: number;
	taxAmount?: number;
	planId: number;
	additionalFees: Array<Pick<AdditionalFee, "id" | "label" | "type" | "amount" | "taxable" | "refundable">>;
};

export function calculateChargeDetails(
	props: CalculateChargeDetailsProps,
): ChargeDetails {
	const {
		amount,
		discount,
		taxRate,
		taxAmount,
		planId,
		additionalFees,
	} = props;

	const productAmount = Math.max(0, amount);
	const normalizedDiscount = typeof discount === "number"
		? { type: "fixed_amount" as const, value: Math.max(0, discount) }
		: discount;
	const intentionallyFree = productAmount === 0
		|| normalizedDiscount?.type === "percentage" && normalizedDiscount.value >= 100
		|| normalizedDiscount?.type === "fixed_amount" && normalizedDiscount.value >= productAmount;

	if (intentionallyFree) {
		return {
			total: 0,
			subTotal: 0,
			unitCost: productAmount,
			tax: 0,
			discount: productAmount,
			productDiscount: productAmount,
			feesAmount: 0,
			additionalFeeTotal: 0,
			additionalFeeLines: [],
		};
	}

	const feeEntries = additionalFees.flatMap((fee) => {
		const price = fee.type === "fixed"
			? fee.amount
			: Math.floor((productAmount * fee.amount) / 10000);
		return price > 0 ? [{ fee, price }] : [];
	});
	const beforeDiscount = productAmount + feeEntries.reduce((total, entry) => total + entry.price, 0);
	const discountAmount = normalizedDiscount?.type === "percentage"
		? Math.floor(beforeDiscount * Math.min(100, Math.max(0, normalizedDiscount.value)) / 100)
		: Math.min(beforeDiscount, Math.max(0, normalizedDiscount?.value ?? 0));

	let remainingDiscount = discountAmount;
	let remainingAmount = beforeDiscount;
	const lineDiscounts = [productAmount, ...feeEntries.map((entry) => entry.price)].map((lineAmount) => {
		const lineDiscount = remainingAmount > 0
			? Math.min(lineAmount, Math.floor(remainingDiscount * lineAmount / remainingAmount))
			: 0;
		remainingDiscount -= lineDiscount;
		remainingAmount -= lineAmount;
		return lineDiscount;
	});
	if (remainingDiscount > 0) {
		lineDiscounts[lineDiscounts.length - 1] = (lineDiscounts.at(-1) ?? 0) + remainingDiscount;
	}

	const productDiscount = lineDiscounts[0] ?? 0;
	const subTotal = productAmount - productDiscount;
	const productTax = taxAmount ?? Math.floor((subTotal * (taxRate || 0)) / 100);
	const additionalFeeLines: InvoiceItem[] = [];
	let additionalFeeTotal = 0;
	let additionalFeeTax = 0;
	for (const [index, entry] of feeEntries.entries()) {
		const lineDiscount = lineDiscounts[index + 1] ?? 0;
		const netAmount = entry.price - lineDiscount;
		const lineTax = entry.fee.taxable
			? Math.floor((netAmount * (taxRate || 0)) / 100)
			: 0;
		additionalFeeTotal += netAmount;
		additionalFeeTax += lineTax;
		additionalFeeLines.push({
			feeId: entry.fee.id,
			refundable: entry.fee.refundable,
			name: entry.fee.label,
			quantity: 1,
			price: entry.price,
			...(lineDiscount > 0 ? { discount: lineDiscount } : {}),
			...(entry.fee.taxable ? { tax: lineTax } : {}),
		});
	}

	const tax = productTax + additionalFeeTax;
	const total = subTotal + additionalFeeTotal + tax;
	const platformFeePercent = getMonstroPlatformFeePercent(planId);
	const feesAmount = platformFeePercent > 0
		? Math.floor(((subTotal + productTax) * platformFeePercent) / 100)
		: 0;

	return {
		total,
		subTotal,
		unitCost: productAmount,
		tax,
		discount: discountAmount,
		productDiscount,
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
