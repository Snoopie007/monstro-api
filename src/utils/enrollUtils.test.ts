import { expect, mock, test } from "bun:test";

mock.module("@/db/db", () => ({ db: {} }));

const { calculateChargeDetails } = await import("./enrollUtils");

test("applies a percentage discount after adding fees", () => {
	const result = calculateChargeDetails({
		amount: 10000,
		discount: { type: "percentage", value: 10 },
		taxRate: 10,
		planId: 1,
		additionalFees: [
			{ id: "fee_fixed", label: "Facility fee", type: "fixed", amount: 1000, taxable: true, refundable: false },
			{ id: "fee_percent", label: "Service fee", type: "percentage", amount: 1000, taxable: false, refundable: true },
		],
	});

	expect(result).toEqual({
		subTotal: 9000,
		unitCost: 10000,
		tax: 990,
		discount: 1200,
		productDiscount: 1000,
		feesAmount: 198,
		additionalFeeTotal: 1800,
		total: 11790,
		additionalFeeLines: [
			{
				feeId: "fee_fixed",
				refundable: false,
				name: "Facility fee",
				quantity: 1,
				price: 1000,
				discount: 100,
				tax: 90,
			},
			{
				feeId: "fee_percent",
				refundable: true,
				name: "Service fee",
				quantity: 1,
				price: 1000,
				discount: 100,
			},
		],
	});
});

test("additional fees do not increase the Monstro platform fee", () => {
	const withoutAdditionalFees = calculateChargeDetails({
		amount: 10000,
		taxRate: 10,
		planId: 1,
		additionalFees: [],
	});
	const withAdditionalFees = calculateChargeDetails({
		amount: 10000,
		taxRate: 10,
		planId: 1,
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
		planId: 1,
		additionalFees: [
			{ id: "fee_1", label: "Facility fee", type: "fixed", amount: 500, taxable: true, refundable: true },
		],
	});

	expect(result.total).toBe(0);
	expect(result.additionalFeeLines).toEqual([]);
});

test("does not charge a Monstro platform fee on paid plans", () => {
	const result = calculateChargeDetails({
		amount: 10000,
		taxRate: 10,
		planId: 2,
		additionalFees: [],
	});

	expect(result.feesAmount).toBe(0);
});
