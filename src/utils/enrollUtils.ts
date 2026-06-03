import type { PaymentType, ChargeDetails } from "@subtrees/types";
import { addDays, addMonths, addWeeks, addYears } from "date-fns";

const GATEWAY_BILLING_FEE = 0.7;
const GATEWAY_FEE_PERCENT = 2.9;
const GATEWAY_FEE_AMOUNT = 30;
const GATEWAY_BANK_FEE = 0.8;

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
	// const monstroFee = Math.floor((price * usagePercent) / 100);

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


