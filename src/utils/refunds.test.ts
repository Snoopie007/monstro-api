import { beforeEach, describe, expect, mock, test } from "bun:test";

const findMany = mock(async () => [
	{ id: "fee-retained", refundable: false },
	{ id: "fee-refunded", refundable: true },
]);

mock.module("@/db/db", () => ({
	db: { query: { additionalFees: { findMany } } },
}));

const { getRefundAmounts } = await import("./refunds");

describe("getRefundAmounts", () => {
	beforeEach(() => mock.clearAllMocks());

	test("retains only fees currently configured as non-refundable, including their tax", async () => {
		const result = await getRefundAmounts("location-1", 1650, [
			{ name: "Membership", quantity: 1, price: 1100 },
			{ kind: "additional_fee", sourceFeeId: "fee-retained", name: "Signup fee", quantity: 1, price: 300, tax: 30 },
			{ kind: "additional_fee", sourceFeeId: "fee-refunded", name: "Service fee", quantity: 1, price: 200, tax: 20 },
		]);

		expect(result).toEqual({ refundableAmount: 1320, nonRefundableAmount: 330 });
	});

	test("treats charges without fee policies as fully refundable", async () => {
		const result = await getRefundAmounts("location-1", 500, [
			{ name: "Drop-in", quantity: 1, price: 500 },
		]);

		expect(result).toEqual({ refundableAmount: 500, nonRefundableAmount: 0 });
		expect(findMany).not.toHaveBeenCalled();
	});
});
