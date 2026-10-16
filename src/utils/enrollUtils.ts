import type { AdditionalFee, ChargeDetails, CheckoutDiscount, InvoiceItem } from "@/subtrees/types";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";
import { db } from "@/db/db";
import { memberContracts } from "@/subtrees/schemas";
import { and, asc, eq } from "drizzle-orm";
import { ensureCurrentLocationWaiver } from "./locationWaiver";
import { getMonstroPlatformFeePercent } from "@/subtrees/utils";

type EnrollTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

/** Resolves the current waiver before creating the enrollment's plan contract. */
export async function createEnrollUnsignedDocs(
    tx: EnrollTx,
    input: { mid: string; lid: string; memberPlanId: string; contractId?: string | null },
): Promise<string[]> {
    const { mid, lid, memberPlanId, contractId } = input;
    const waiver = await ensureCurrentLocationWaiver(tx, input);
    const unsignedDocs: string[] = waiver.pendingDocId ? [waiver.pendingDocId] : [];
    if (contractId && contractId !== waiver.waiverId) {
        const documents = await tx.select().from(memberContracts).where(and(
            eq(memberContracts.memberId, mid),
            eq(memberContracts.locationId, lid),
            eq(memberContracts.templateId, contractId),
            eq(memberContracts.memberPlanId, memberPlanId),
        )).orderBy(asc(memberContracts.created), asc(memberContracts.id)).for("update");
        if (!documents.some((doc) => doc.signedOn)) {
            const pending = documents.find((doc) => !doc.signedOn);
            if (pending) {
                unsignedDocs.push(pending.id);
            } else {
                const [created] = await tx.insert(memberContracts).values({
                    memberId: mid,
                    templateId: contractId,
                    locationId: lid,
                    memberPlanId,
                }).returning({ id: memberContracts.id });
                if (!created) throw new Error("Failed to create plan contract document");
                unsignedDocs.push(created.id);
            }
        }
    }
    return [...new Set(unsignedDocs)];
}

/** Recovers the same documents under the enrollment resolver's locks. */
export async function recoverEnrollUnsignedDocs(input: {
    mid: string;
    lid: string;
    memberPlanId: string;
    contractId?: string | null;
}): Promise<string[]> {
    return db.transaction((tx) => createEnrollUnsignedDocs(tx, input));
}

export type CalculateChargeDetailsProps = {
	amount: number;
	discount?: CheckoutDiscount | number;
	taxRate: number;
	/** Existing invoice flows pass stored product tax here so fee changes do not
	 * recalculate it. New checkouts omit it and use taxRate. */
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
