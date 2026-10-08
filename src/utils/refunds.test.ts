import { describe, expect, test } from "bun:test";
import { getRefundAmounts } from "./refunds";

describe("getRefundAmounts", () => {
	test("retains only fee lines captured as non-refundable, including their tax", () => {
		const result = getRefundAmounts(1650, [
			{ name: "Membership", quantity: 1, price: 1100 },
			{ feeId: "fee-retained", refundable: false, name: "Signup fee", quantity: 1, price: 300, tax: 30 },
			{ feeId: "fee-refunded", refundable: true, name: "Service fee", quantity: 1, price: 200, tax: 20 },
		]);

		expect(result).toEqual({ refundableAmount: 1320, nonRefundableAmount: 330 });
	});

	test("treats older lines without a refund snapshot as refundable", () => {
		const result = getRefundAmounts(800, [
			{ name: "Drop-in", quantity: 1, price: 500 },
			{ feeId: "legacy-fee", name: "Service fee", quantity: 1, price: 300 },
		]);

		expect(result).toEqual({ refundableAmount: 800, nonRefundableAmount: 0 });
	});

	test("retains only the discounted amount of a non-refundable fee", () => {
		const result = getRefundAmounts(900, [
			{ name: "Membership", quantity: 1, price: 800, discount: 100 },
			{ feeId: "fee-retained", refundable: false, name: "Signup fee", quantity: 1, price: 300, discount: 120, tax: 20 },
		]);

		expect(result).toEqual({ refundableAmount: 700, nonRefundableAmount: 200 });
	});
});
