import { expect, test } from "bun:test";
import { calculateOrderTotals } from "./orderUtils";

test("uses inventory pricing, quantity, and unlimited promos for order totals", () => {
  expect(calculateOrderTotals(
    [{ variantId: "variant-1", quantity: 2 }],
    [{ id: "variant-1", name: "Gloves", price: 1000, salePrice: 800 }],
    10,
    false,
    0,
    { redemptionCount: 0, maxRedemptions: null, type: "percentage", value: 10 },
  )).toMatchObject({
    subtotal: 1600,
    discount: 160,
    tax: 160,
    total: 1600,
    lineItems: [{ variantId: "variant-1", quantity: 2, unitCost: 800, tax: 160 }],
  });
});
