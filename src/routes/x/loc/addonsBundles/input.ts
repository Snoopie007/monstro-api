import type {
  AddonBundleCatalogOptions,
  AddonBundlePlanPricingOption,
  AddonEditorInput,
  BundleEditorInput,
} from "@subtrees/types";
import { t } from "elysia";

const addonBodyFields = {
  name: t.String({ minLength: 1 }),
  description: t.Nullable(t.String()),
  amount: t.Integer({ minimum: 0 }),
  currency: t.String({ minLength: 3, maxLength: 3 }),
  classAccessOverride: t.Nullable(t.Literal("unlimited")),
  planPriceOverrides: t.Array(t.Object({
    sourcePlanPricingId: t.String({ minLength: 1 }),
    replacementPlanPricingId: t.String({ minLength: 1 }),
  })),
};

export const addonEditorBody = t.Union([
  t.Object({
    ...addonBodyFields,
    billingType: t.Literal("one_time"),
    interval: t.Null(),
    intervalThreshold: t.Null(),
  }),
  t.Object({
    ...addonBodyFields,
    billingType: t.Literal("recurring"),
    interval: t.Union([t.Literal("day"), t.Literal("week"), t.Literal("month"), t.Literal("year")]),
    intervalThreshold: t.Integer({ minimum: 1 }),
  }),
]);

const bundleComponentBodyFields = {
  priceOverride: t.Nullable(t.Integer({ minimum: 0 })),
  required: t.Boolean(),
};

export const bundleEditorBody = t.Object({
  name: t.String({ minLength: 1 }),
  description: t.Nullable(t.String()),
  components: t.Array(t.Union([
    t.Object({
      ...bundleComponentBodyFields,
      type: t.Literal("subscription"),
      memberPlanPricingId: t.String({ minLength: 1 }),
    }),
    t.Object({
      ...bundleComponentBodyFields,
      type: t.Literal("addon"),
      addonId: t.String({ minLength: 1 }),
    }),
  ]), { minItems: 1 }),
});

export function validateAddonEditorInput(
  input: AddonEditorInput,
  planPricings: AddonBundlePlanPricingOption[],
) {
  if (!input.name.trim()) return "Add-on name is required";

  const pricingById = new Map(planPricings.map((pricing) => [pricing.id, pricing]));
  const sourcePricingIds = new Set<string>();

  for (const mapping of input.planPriceOverrides) {
    const sourcePricing = pricingById.get(mapping.sourcePlanPricingId);
    const replacementPricing = pricingById.get(mapping.replacementPlanPricingId);

    if (!sourcePricing || !replacementPricing) {
      return "Every price change must use an available subscription price";
    }

    if (mapping.sourcePlanPricingId === mapping.replacementPlanPricingId) {
      return "A regular price and its add-on price must be different";
    }

    if (sourcePricing.memberPlanId !== replacementPricing.memberPlanId) {
      return "A price change must stay within the same subscription plan";
    }

    if (
      sourcePricing.interval !== replacementPricing.interval
      || sourcePricing.intervalThreshold !== replacementPricing.intervalThreshold
    ) {
      return "An add-on can change the subscription price, but not its billing schedule";
    }

    if (sourcePricingIds.has(mapping.sourcePlanPricingId)) {
      return "Each regular subscription price can only be changed once";
    }

    sourcePricingIds.add(mapping.sourcePlanPricingId);
  }

  return null;
}

export function validateBundleEditorInput(
  input: BundleEditorInput,
  options: AddonBundleCatalogOptions,
) {
  if (!input.name.trim()) return "Bundle name is required";
  if (!input.components.some((component) => component.type === "subscription" && component.required)) {
    return "A bundle needs at least one required subscription";
  }

  const planPricingIds = new Set(options.planPricings.map((pricing) => pricing.id));
  const addonIds = new Set(options.addons.map((addon) => addon.id));
  const productKeys = new Set<string>();

  for (const component of input.components) {
    const productId = component.type === "subscription" ? component.memberPlanPricingId : component.addonId;
    const productKey = `${component.type}:${productId}`;

    if (productKeys.has(productKey)) return "A product can only appear once in a bundle";
    productKeys.add(productKey);

    if (component.type === "subscription" && !planPricingIds.has(component.memberPlanPricingId)) {
      return "Every subscription in a bundle must be available at this location";
    }

    if (component.type === "addon" && !addonIds.has(component.addonId)) {
      return "Every add-on in a bundle must be available at this location";
    }
  }

  return null;
}
