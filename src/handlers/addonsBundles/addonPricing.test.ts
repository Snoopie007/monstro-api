import { describe, expect, test } from "bun:test";
import { hasMixedReplacements } from "./addonPricing";

describe("subscription add-on replacement pricing", () => {
  test("allows add-ons with no replacement pricing or the same replacement price", () => {
    expect(hasMixedReplacements([])).toBe(false);
    expect(hasMixedReplacements([
      { addonId: "addon_1", replacementPlanPricingId: "price_member" },
      { addonId: "addon_2", replacementPlanPricingId: "price_member" },
    ])).toBe(false);
  });

  test("rejects add-ons that resolve to different replacement prices", () => {
    expect(hasMixedReplacements([
      { addonId: "addon_1", replacementPlanPricingId: "price_member" },
      { addonId: "addon_2", replacementPlanPricingId: "price_vip" },
    ])).toBe(true);
  });
});
