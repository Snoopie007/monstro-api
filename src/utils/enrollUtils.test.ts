import { expect, mock, test } from "bun:test";

mock.module("@/db/db", () => ({ db: {} }));

const { calculateChargeDetails } = await import("./enrollUtils");

test("calculates fixed and percentage additional fees from the discounted subtotal", () => {
	const result = calculateChargeDetails({
		amount: 10000,
		discount: 1000,
		taxRate: 5,
		usagePercent: 4,
		additionalFees: [
			{ id: "fee_fixed", label: "Facility fee", type: "fixed", amount: 250 },
			{ id: "fee_percent", label: "Service fee", type: "percentage", amount: 350 },
		],
	});

	expect(result).toEqual({
		subTotal: 9000,
		unitCost: 9000,
		tax: 450,
		feesAmount: 378,
		additionalFeeTotal: 565,
		total: 10015,
		additionalFeeLines: [
			{
				kind: "additional_fee",
				sourceFeeId: "fee_fixed",
				name: "Facility fee",
				quantity: 1,
				price: 250,
			},
			{
				kind: "additional_fee",
				sourceFeeId: "fee_percent",
				name: "Service fee",
				quantity: 1,
				price: 315,
			},
		],
	});
});

test("additional fees do not increase the Monstro platform fee", () => {
	const withoutAdditionalFees = calculateChargeDetails({
		amount: 10000,
		taxRate: 0,
		usagePercent: 5,
		additionalFees: [],
	});
	const withAdditionalFees = calculateChargeDetails({
		amount: 10000,
		taxRate: 0,
		usagePercent: 5,
		additionalFees: [
			{ id: "fee_1", label: "Service fee", type: "fixed", amount: 500 },
		],
	});

	expect(withAdditionalFees.feesAmount).toBe(withoutAdditionalFees.feesAmount);
	expect(withAdditionalFees.total).toBe(withoutAdditionalFees.total + 500);
});
