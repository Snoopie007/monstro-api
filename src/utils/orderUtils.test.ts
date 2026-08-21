import { expect, test } from "bun:test";
import { calculateOrderTotals } from "./orderUtils";

test("uses inventory pricing, quantity, and unlimited promos for order totals", () => {
  expect(calculateOrderTotals(
    [{ variantId: "variant-1", quantity: 2 }],
    [{ id: "variant-1", name: "Gloves", price: 1000, salePrice: 800 }],
    10,
    0,
    [],
    { redemptionCount: 0, maxRedemptions: null, type: "percentage", value: 10 },
  )).toMatchObject({
    subtotal: 1600,
    discount: 160,
    tax: 160,
    total: 1600,
    lineItems: [{ variantId: "variant-1", quantity: 2, unitCost: 800, tax: 160 }],
  });
});

test("adds scoped fees without adding Monstro's platform fee to the member total", () => {
  expect(calculateOrderTotals(
    [{ variantId: "variant-1", quantity: 1 }],
    [{ id: "variant-1", name: "Gloves", price: 1000, salePrice: null }],
    0,
    5,
    [{ id: "fee-1", label: "Facility fee", type: "percentage", amount: 500 }],
  )).toMatchObject({
    subtotal: 1000,
    platformFeeAmount: 50,
    additionalFeeTotal: 50,
    total: 1050,
    additionalFeeLines: [{ kind: "additional_fee", sourceFeeId: "fee-1", price: 50 }],
  });
});
