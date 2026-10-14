import type { db } from "@/db/db";
import {
  addonPlanPriceOverrides,
  memberSubscriptionAddons,
  memberSubscriptions,
} from "@/subtrees/schemas";
import { and, eq, gt, inArray, isNull, lte, or } from "drizzle-orm";

type PricingReader = Pick<typeof db, "select" | "query">;

export type ActiveAddonPriceOverride = {
  addonId: string;
  replacementPlanPricingId: string;
};

export const OPEN_ADDON_PURCHASE_STATUSES = ["pending", "active", "past_due"] as const;

export function hasConflictingReplacementPricing(
  mappings: Iterable<ActiveAddonPriceOverride>,
) {
  return new Set(Array.from(mappings, (mapping) => mapping.replacementPlanPricingId)).size > 1;
}

export async function loadActiveAddonPriceOverrides(
  database: PricingReader,
  sourcePlanPricingId: string,
  addonIds: Iterable<string>,
  at = new Date(),
) {
  const uniqueAddonIds = Array.from(new Set(addonIds));
  if (uniqueAddonIds.length === 0) return [];

  return database.select({
    addonId: addonPlanPriceOverrides.addonId,
    replacementPlanPricingId: addonPlanPriceOverrides.replacementPlanPricingId,
  }).from(addonPlanPriceOverrides).where(and(
    inArray(addonPlanPriceOverrides.addonId, uniqueAddonIds),
    eq(addonPlanPriceOverrides.sourcePlanPricingId, sourcePlanPricingId),
    eq(addonPlanPriceOverrides.archived, false),
    or(isNull(addonPlanPriceOverrides.startsAt), lte(addonPlanPriceOverrides.startsAt, at)),
    or(isNull(addonPlanPriceOverrides.endsAt), gt(addonPlanPriceOverrides.endsAt, at)),
  ));
}

export async function hasConflictingAddonPriceOverrides(
  database: PricingReader,
  sourcePlanPricingId: string,
  addonIds: Iterable<string>,
  at = new Date(),
) {
  return hasConflictingReplacementPricing(
    await loadActiveAddonPriceOverrides(database, sourcePlanPricingId, addonIds, at),
  );
}

export async function hasConflictingSubscriptionAddonPricing(
  database: PricingReader,
  memberSubscriptionId: string,
  additionalAddonIds: Iterable<string> = [],
  at = new Date(),
) {
  const subscription = await database.query.memberSubscriptions.findFirst({
    where: eq(memberSubscriptions.id, memberSubscriptionId),
    columns: { memberPlanPricingId: true },
  });
  if (!subscription?.memberPlanPricingId) return false;

  const purchases = await database.query.memberSubscriptionAddons.findMany({
    where: and(
      eq(memberSubscriptionAddons.memberSubscriptionId, memberSubscriptionId),
      inArray(memberSubscriptionAddons.status, [...OPEN_ADDON_PURCHASE_STATUSES]),
    ),
    columns: { addonId: true },
  });

  return hasConflictingAddonPriceOverrides(
    database,
    subscription.memberPlanPricingId,
    [...purchases.map((purchase) => purchase.addonId), ...additionalAddonIds],
    at,
  );
}
