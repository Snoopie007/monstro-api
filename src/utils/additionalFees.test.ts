import { expect, mock, test } from "bun:test";

const findMany = mock(async () => [
	{
		id: "fee_package",
		locationId: "location_1",
		label: "Package fee",
		description: null,
		type: "fixed" as const,
		amount: 250,
		checkoutTypes: ["package", "subscription"] as const,
		active: true,
		created: new Date("2026-01-01T00:00:00Z"),
		updated: new Date("2026-01-01T00:00:00Z"),
	},
	{
		id: "fee_order",
		locationId: "location_1",
		label: "Order fee",
		description: null,
		type: "percentage" as const,
		amount: 500,
		checkoutTypes: ["order"] as const,
		active: true,
		created: new Date("2026-01-02T00:00:00Z"),
		updated: new Date("2026-01-02T00:00:00Z"),
	},
]);

mock.module("@/db/db", () => ({
	db: { query: { additionalFees: { findMany } } },
}));

const { getAdditionalFeesForCheckout } = await import("./additionalFees");

test("returns only fees configured for the checkout type", async () => {
	const fees = await getAdditionalFeesForCheckout("location_1", "order");

	expect(fees.map((fee) => fee.id)).toEqual(["fee_order"]);
	expect(findMany).toHaveBeenCalledTimes(1);
});
