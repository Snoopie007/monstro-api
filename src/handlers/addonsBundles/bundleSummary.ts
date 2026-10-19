import { db, type DbReader } from "@/db/db";
import {
  addons,
  bundleComponents,
  bundlePurchases,
  bundles,
  memberPlanPricing,
  memberPlans,
  memberSubscriptionAddons,
  memberSubscriptions,
} from "@/subtrees/schemas";
import type { SubscriptionBundleSummary } from "@/subtrees/types";
import { and, asc, eq, inArray } from "drizzle-orm";

/** Display names for bundle components: "Plan · Price" for a subscription, the add-on's own name otherwise. */
export async function getComponentNames(reader: DbReader, components: Array<{ memberPlanPricingId: string | null; addonId: string | null }>) {
  const pricingIds = [...new Set(components.flatMap((component) => component.memberPlanPricingId ? [component.memberPlanPricingId] : []))];
  const addonIds = [...new Set(components.flatMap((component) => component.addonId ? [component.addonId] : []))];
  const [pricingRows, addonRows] = await Promise.all([
    pricingIds.length === 0 ? [] : reader.select({ id: memberPlanPricing.id, name: memberPlanPricing.name, planName: memberPlans.name })
      .from(memberPlanPricing)
      .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
      .where(inArray(memberPlanPricing.id, pricingIds)),
    addonIds.length === 0 ? [] : reader.select({ id: addons.id, name: addons.name }).from(addons).where(inArray(addons.id, addonIds)),
  ]);
  return {
    pricingNames: new Map(pricingRows.map((pricing) => [pricing.id, `${pricing.planName} · ${pricing.name}`])),
    addonNames: new Map(addonRows.map((addon) => [addon.id, addon.name])),
  };
}

export async function getBundleSummary(
  locationId: string,
  bundlePurchaseId: string,
): Promise<SubscriptionBundleSummary | null> {
  const [purchase] = await db.select({
    id: bundlePurchases.id,
    bundleId: bundlePurchases.bundleId,
    bundleName: bundles.name,
    status: bundlePurchases.status,
    startsAt: bundlePurchases.startsAt,
    endedAt: bundlePurchases.endedAt,
  }).from(bundlePurchases)
    .innerJoin(bundles, eq(bundles.id, bundlePurchases.bundleId))
    .where(and(eq(bundlePurchases.id, bundlePurchaseId), eq(bundles.locationId, locationId)))
    .limit(1);
  if (!purchase) return null;

  const componentRows = await db.select({
    id: bundleComponents.id,
    memberPlanPricingId: bundleComponents.memberPlanPricingId,
    addonId: bundleComponents.addonId,
    priceOverride: bundleComponents.priceOverride,
    required: bundleComponents.required,
    sortOrder: bundleComponents.sortOrder,
  }).from(bundleComponents)
    .where(eq(bundleComponents.bundleId, purchase.bundleId))
    .orderBy(asc(bundleComponents.sortOrder));
  const [{ pricingNames, addonNames }, subscriptionRows, addonPurchaseRows] = await Promise.all([
    getComponentNames(db, componentRows),
    db.select({ id: memberSubscriptions.id, componentId: memberSubscriptions.bundleComponentId })
      .from(memberSubscriptions).where(eq(memberSubscriptions.bundlePurchaseId, purchase.id)),
    db.select({ id: memberSubscriptionAddons.id, componentId: memberSubscriptionAddons.bundleComponentId })
      .from(memberSubscriptionAddons).where(eq(memberSubscriptionAddons.bundlePurchaseId, purchase.id)),
  ]);
  const subscriptionsByComponent = new Map(subscriptionRows.map((subscription) => [subscription.componentId, subscription.id]));
  const addonsByComponent = new Map(addonPurchaseRows.map((addon) => [addon.componentId, addon.id]));
  const purchasedComponentIds = new Set([
    ...subscriptionsByComponent.keys(),
    ...addonsByComponent.keys(),
  ]);

  const describe = (component: typeof componentRows[number]) => component.memberPlanPricingId
    ? { type: "subscription" as const, name: pricingNames.get(component.memberPlanPricingId) ?? "Subscription" }
    : { type: "addon" as const, name: addonNames.get(component.addonId ?? "") ?? "Add-on" };

  return {
    ...purchase,
    startsAt: purchase.startsAt.toISOString(),
    endedAt: purchase.endedAt?.toISOString() ?? null,
    components: componentRows.flatMap((component) => purchasedComponentIds.has(component.id)
      ? [{
        id: component.id,
        ...describe(component),
        priceOverride: component.priceOverride,
        required: component.required,
        memberSubscriptionId: subscriptionsByComponent.get(component.id) ?? null,
        memberSubscriptionAddonId: addonsByComponent.get(component.id) ?? null,
      }]
      : []),
  };
}
