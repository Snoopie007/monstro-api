import type { AddonBundleCatalogOptions, AddonEditorInput, BundleEditorInput } from "@subtrees/types";
import { describe, expect, test } from "bun:test";
import { validateAddonEditorInput, validateBundleEditorInput } from "./input";

const options: AddonBundleCatalogOptions = {
  planPricings: [
    { id: "singles_regular", memberPlanId: "singles", planName: "Singles", name: "Regular", price: 50000, interval: "month", intervalThreshold: 1 },
    { id: "singles_member", memberPlanId: "singles", planName: "Singles", name: "Member", price: 35000, interval: "month", intervalThreshold: 1 },
    { id: "doubles_member", memberPlanId: "doubles", planName: "Doubles", name: "Member", price: 68250, interval: "month", intervalThreshold: 1 },
  ],
  addons: [
    { id: "annual_membership", name: "Annual membership", amount: 19900, currency: "USD", billingType: "recurring", interval: "year", intervalThreshold: 1 },
  ],
};

const addonInput: AddonEditorInput = {
  name: "Annual membership",
  description: null,
  amount: 19900,
  currency: "USD",
  billingType: "recurring",
  interval: "year",
  intervalThreshold: 1,
  classAccessOverride: "unlimited",
  planPriceOverrides: [{ sourcePlanPricingId: "singles_regular", replacementPlanPricingId: "singles_member" }],
};

const bundleInput: BundleEditorInput = {
  name: "Singles bundle",
  description: null,
  components: [
    { type: "subscription", memberPlanPricingId: "singles_regular", priceOverride: 32000, required: true },
    { type: "addon", addonId: "annual_membership", priceOverride: null, required: true },
  ],
};

describe("add-on and bundle request validation", () => {
  test("accepts valid catalog inputs", () => {
    expect(validateAddonEditorInput(addonInput, options.planPricings)).toBeNull();
    expect(validateBundleEditorInput(bundleInput, options)).toBeNull();
  });

  test("rejects price changes across subscription plans", () => {
    expect(validateAddonEditorInput({
      ...addonInput,
      planPriceOverrides: [{ sourcePlanPricingId: "singles_regular", replacementPlanPricingId: "doubles_member" }],
    }, options.planPricings)).toBe("A price change must stay within the same subscription plan");
  });

  test("rejects bundles without a required subscription", () => {
    expect(validateBundleEditorInput({
      ...bundleInput,
      components: [{ type: "addon", addonId: "annual_membership", priceOverride: null, required: true }],
    }, options)).toBe("A bundle needs at least one required subscription");
  });
});
