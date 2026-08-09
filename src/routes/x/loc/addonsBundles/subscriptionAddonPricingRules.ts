export type ActiveAddonPriceOverride = {
  addonId: string;
  replacementPlanPricingId: string;
};

export function hasConflictingReplacementPricing(
  mappings: Iterable<ActiveAddonPriceOverride>,
) {
  return new Set(Array.from(mappings, (mapping) => mapping.replacementPlanPricingId)).size > 1;
}
