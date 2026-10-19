import { db } from "@/db/db";
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
  const pricingIds = componentRows.flatMap((component) => component.memberPlanPricingId ? [component.memberPlanPricingId] : []);
  const addonIds = componentRows.flatMap((component) => component.addonId ? [component.addonId] : []);
  const [pricingRows, addonRows, subscriptionRows, addonPurchaseRows] = await Promise.all([
    pricingIds.length === 0 ? [] : db.select({
      id: memberPlanPricing.id,
      pricingName: memberPlanPricing.name,
      planName: memberPlans.name,
    }).from(memberPlanPricing)
      .innerJoin(memberPlans, eq(memberPlans.id, memberPlanPricing.memberPlanId))
      .where(inArray(memberPlanPricing.id, pricingIds)),
    addonIds.length === 0 ? [] : db.select({ id: addons.id, name: addons.name })
      .from(addons).where(inArray(addons.id, addonIds)),
    db.select({ id: memberSubscriptions.id, componentId: memberSubscriptions.bundleComponentId })
      .from(memberSubscriptions).where(eq(memberSubscriptions.bundlePurchaseId, purchase.id)),
    db.select({ id: memberSubscriptionAddons.id, componentId: memberSubscriptionAddons.bundleComponentId })
      .from(memberSubscriptionAddons).where(eq(memberSubscriptionAddons.bundlePurchaseId, purchase.id)),
  ]);
  const pricingNames = new Map(pricingRows.map((pricing) => [pricing.id, `${pricing.planName} · ${pricing.pricingName}`]));
  const addonNames = new Map(addonRows.map((addon) => [addon.id, addon.name]));
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

export async function getSubscriptionBundle(locationId: string, subscriptionId: string) {
  const subscription = await db.query.memberSubscriptions.findFirst({
    where: and(eq(memberSubscriptions.id, subscriptionId), eq(memberSubscriptions.locationId, locationId)),
    columns: { bundlePurchaseId: true },
  });
  return subscription?.bundlePurchaseId
    ? getBundleSummary(locationId, subscription.bundlePurchaseId)
    : null;
}
