import { and, eq, gt, gte, inArray, isNull, lte, or } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "../../schemas";
import { OPEN_ADDON_PURCHASE_STATUSES } from "../addonsBundles";

const { addonPlanPriceOverrides, addons, memberSubscriptionAddons, memberSubscriptions } = schema;
type Reader = Pick<PostgresJsDatabase<typeof schema>, "select">;

/** An add-on's price override that is in effect at `at`. */
export function activeOverride(at: Date) {
  return and(
    eq(addonPlanPriceOverrides.archived, false),
    or(isNull(addonPlanPriceOverrides.startsAt), lte(addonPlanPriceOverrides.startsAt, at)),
    or(isNull(addonPlanPriceOverrides.endsAt), gt(addonPlanPriceOverrides.endsAt, at)),
  );
}

/** The replacement prices these add-ons apply to the source plan price at `at`. */
export async function getActiveOverrides(database: Reader, sourcePlanPricingId: string, addonIds: Iterable<string>, at = new Date()) {
  const uniqueAddonIds = [...new Set(addonIds)];
  if (uniqueAddonIds.length === 0) return [];

  return database.select({
    addonId: addonPlanPriceOverrides.addonId,
    replacementPlanPricingId: addonPlanPriceOverrides.replacementPlanPricingId,
  }).from(addonPlanPriceOverrides).where(and(
    inArray(addonPlanPriceOverrides.addonId, uniqueAddonIds),
    eq(addonPlanPriceOverrides.sourcePlanPricingId, sourcePlanPricingId),
    activeOverride(at),
  ));
}

/** True when these add-ons would switch the plan price to different prices at `at`. */
export async function hasAddonConflict(database: Reader, sourcePlanPricingId: string, addonIds: Iterable<string>, at = new Date()) {
  const mappings = await getActiveOverrides(database, sourcePlanPricingId, addonIds, at);
  return new Set(mappings.map((mapping) => mapping.replacementPlanPricingId)).size > 1;
}

/** True when two of the subscription's open add-ons would switch its current plan
 * price to different prices at `at`, so its price is unclear until staff resolve it. */
export async function hasSubscriptionConflict(database: Reader, memberSubscriptionId: string, at = new Date()) {
  const mappings = await database.select({ replacementPlanPricingId: addonPlanPriceOverrides.replacementPlanPricingId })
    .from(memberSubscriptionAddons)
    .innerJoin(memberSubscriptions, eq(memberSubscriptions.id, memberSubscriptionAddons.memberSubscriptionId))
    .innerJoin(addonPlanPriceOverrides, and(
      eq(addonPlanPriceOverrides.addonId, memberSubscriptionAddons.addonId),
      eq(addonPlanPriceOverrides.sourcePlanPricingId, memberSubscriptions.memberPlanPricingId),
    ))
    .where(and(
      eq(memberSubscriptionAddons.memberSubscriptionId, memberSubscriptionId),
      inArray(memberSubscriptionAddons.status, [...OPEN_ADDON_PURCHASE_STATUSES]),
      activeOverride(at),
    ));

  return new Set(mappings.map((mapping) => mapping.replacementPlanPricingId)).size > 1;
}

/** True when the subscription has a paid, active add-on that grants unlimited class access at `at`. */
export async function hasUnlimitedAddon(database: Reader, memberSubscriptionId: string, at = new Date()) {
  const [purchase] = await database.select({ id: memberSubscriptionAddons.id })
    .from(memberSubscriptionAddons)
    .innerJoin(addons, eq(addons.id, memberSubscriptionAddons.addonId))
    .where(and(
      eq(memberSubscriptionAddons.memberSubscriptionId, memberSubscriptionId),
      eq(memberSubscriptionAddons.status, "active"),
      lte(memberSubscriptionAddons.startsAt, at),
      lte(memberSubscriptionAddons.paidPeriodStartsAt, at),
      or(isNull(memberSubscriptionAddons.paidPeriodEndsAt), gte(memberSubscriptionAddons.paidPeriodEndsAt, at)),
      eq(addons.classAccessOverride, "unlimited"),
    ))
    .limit(1);

  return Boolean(purchase);
}
