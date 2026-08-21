import { expect, mock, test } from "bun:test";

mock.module("@/db/db", () => ({ db: {} }));

const { calculateChargeDetails } = await import("./enrollUtils");

test("calculates fee amounts and taxable fee tax from the discounted subtotal", () => {
	const result = calculateChargeDetails({
		amount: 10000,
		discount: 1000,
		taxRate: 5,
		usagePercent: 4,
		additionalFees: [
			{ id: "fee_fixed", label: "Facility fee", type: "fixed", amount: 250, taxable: true, refundable: false },
			{ id: "fee_percent", label: "Service fee", type: "percentage", amount: 350, taxable: false, refundable: true },
		],
	});

	expect(result).toEqual({
		subTotal: 9000,
		unitCost: 9000,
		tax: 462,
		feesAmount: 378,
		additionalFeeTotal: 565,
		total: 10027,
		additionalFeeLines: [
			{
				feeId: "fee_fixed",
				refundable: false,
				name: "Facility fee",
				quantity: 1,
				price: 250,
				tax: 12,
			},
			{
				feeId: "fee_percent",
				refundable: true,
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
		taxRate: 10,
		usagePercent: 5,
		additionalFees: [],
	});
	const withAdditionalFees = calculateChargeDetails({
		amount: 10000,
		taxRate: 10,
		usagePercent: 5,
		additionalFees: [
			{ id: "fee_1", label: "Service fee", type: "fixed", amount: 500, taxable: true, refundable: true },
		],
	});

	expect(withAdditionalFees.feesAmount).toBe(withoutAdditionalFees.feesAmount);
	expect(withAdditionalFees.total).toBe(withoutAdditionalFees.total + 550);
});

test("does not add fees when the discounted subtotal is zero", () => {
	const result = calculateChargeDetails({
		amount: 1000,
		discount: 1000,
		taxRate: 10,
		usagePercent: 5,
		additionalFees: [
			{ id: "fee_1", label: "Facility fee", type: "fixed", amount: 500, taxable: true, refundable: true },
		],
	});

	expect(result.total).toBe(0);
	expect(result.additionalFeeLines).toEqual([]);
});
