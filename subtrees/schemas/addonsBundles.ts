import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  index,
  integer,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { IntervalType } from "./DatabaseEnums";
import { locations } from "./locations";
import { memberSubscriptions } from "./MemberEnrollment";
import { memberPlanPricing } from "./MemberPlan";
import { members } from "./members";

export const addonBillingTypes = ["one_time", "recurring"] as const;
export const addonClassAccessOverrides = ["unlimited"] as const;
export const memberSubscriptionAddonStatuses = ["pending", "active", "past_due", "canceled", "expired"] as const;
export const bundlePurchaseStatuses = ["pending", "active", "canceled", "expired"] as const;

export const addons = pgTable("addons", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62('adn_')`),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  amount: integer("amount").notNull().default(0),
  currency: text("currency").notNull().default("USD"),
  billingType: text("billing_type", { enum: addonBillingTypes }).notNull(),
  interval: IntervalType("interval"),
  intervalThreshold: integer("interval_threshold"),
  classAccessOverride: text("class_access_override", { enum: addonClassAccessOverrides }),
  archived: boolean("archived").notNull().default(false),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("addons_location_archived_idx").on(table.locationId, table.archived),
  check("addons_amount_nonnegative", sql`${table.amount} >= 0`),
  check("addons_currency_length", sql`char_length(${table.currency}) = 3`),
  check("addons_name_not_blank", sql`char_length(btrim(${table.name})) > 0`),
  check("addons_billing_cycle_check", sql`
    (${table.billingType} = 'one_time' and ${table.interval} is null and ${table.intervalThreshold} is null)
    or
    (${table.billingType} = 'recurring' and ${table.interval} is not null and ${table.intervalThreshold} > 0)
  `),
]);

export const addonPlanPriceOverrides = pgTable("addon_plan_price_overrides", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62('aov_')`),
  addonId: text("addon_id").notNull().references(() => addons.id, { onDelete: "cascade" }),
  sourcePlanPricingId: text("source_plan_pricing_id").notNull().references(() => memberPlanPricing.id, { onDelete: "restrict" }),
  replacementPlanPricingId: text("replacement_plan_pricing_id").notNull().references(() => memberPlanPricing.id, { onDelete: "restrict" }),
  startsAt: timestamp("starts_at", { withTimezone: true }),
  endsAt: timestamp("ends_at", { withTimezone: true }),
  archived: boolean("archived").notNull().default(false),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  uniqueIndex("addon_plan_price_overrides_active_unique")
    .on(table.addonId, table.sourcePlanPricingId)
    .where(sql`${table.archived} = false`),
  index("addon_plan_price_overrides_replacement_idx").on(table.replacementPlanPricingId),
  check("addon_plan_price_overrides_distinct_prices", sql`${table.sourcePlanPricingId} <> ${table.replacementPlanPricingId}`),
  check("addon_plan_price_overrides_date_order", sql`${table.endsAt} is null or ${table.startsAt} is null or ${table.endsAt} > ${table.startsAt}`),
]);

export const bundles = pgTable("bundles", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62('bnd_')`),
  locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  archived: boolean("archived").notNull().default(false),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("bundles_location_archived_idx").on(table.locationId, table.archived),
  check("bundles_name_not_blank", sql`char_length(btrim(${table.name})) > 0`),
]);

export const bundleComponents = pgTable("bundle_components", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62('bcmp_')`),
  bundleId: text("bundle_id").notNull().references(() => bundles.id, { onDelete: "cascade" }),
  memberPlanPricingId: text("member_plan_pricing_id").references(() => memberPlanPricing.id, { onDelete: "restrict" }),
  addonId: text("addon_id").references(() => addons.id, { onDelete: "restrict" }),
  priceOverride: integer("price_override"),
  required: boolean("required").notNull().default(true),
  sortOrder: integer("sort_order").notNull().default(0),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("bundle_components_bundle_sort_idx").on(table.bundleId, table.sortOrder),
  uniqueIndex("bundle_components_subscription_unique")
    .on(table.bundleId, table.memberPlanPricingId)
    .where(sql`${table.memberPlanPricingId} is not null`),
  uniqueIndex("bundle_components_addon_unique")
    .on(table.bundleId, table.addonId)
    .where(sql`${table.addonId} is not null`),
  check("bundle_components_exactly_one_product", sql`num_nonnulls(${table.memberPlanPricingId}, ${table.addonId}) = 1`),
  check("bundle_components_price_override_nonnegative", sql`${table.priceOverride} is null or ${table.priceOverride} >= 0`),
  check("bundle_components_sort_order_nonnegative", sql`${table.sortOrder} >= 0`),
]);

export const bundlePurchases = pgTable("bundle_purchases", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62('bpur_')`),
  bundleId: text("bundle_id").notNull().references(() => bundles.id, { onDelete: "restrict" }),
  memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
  status: text("status", { enum: bundlePurchaseStatuses }).notNull().default("pending"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  cancelReason: text("cancel_reason"),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("bundle_purchases_member_status_idx").on(table.memberId, table.status),
  index("bundle_purchases_bundle_idx").on(table.bundleId),
  check("bundle_purchases_date_order", sql`${table.endedAt} is null or ${table.endedAt} >= ${table.startsAt}`),
]);

export const memberSubscriptionAddons = pgTable("member_subscription_addons", {
  id: text("id").primaryKey().notNull().default(sql`uuid_base62('msa_')`),
  memberSubscriptionId: text("member_subscription_id").notNull().references(() => memberSubscriptions.id, { onDelete: "cascade" }),
  addonId: text("addon_id").notNull().references(() => addons.id, { onDelete: "restrict" }),
  status: text("status", { enum: memberSubscriptionAddonStatuses }).notNull().default("pending"),
  startsAt: timestamp("starts_at", { withTimezone: true }).notNull().defaultNow(),
  paidPeriodStartsAt: timestamp("paid_period_starts_at", { withTimezone: true }),
  paidPeriodEndsAt: timestamp("paid_period_ends_at", { withTimezone: true }),
  nextBillAt: timestamp("next_bill_at", { withTimezone: true }),
  cancelAt: timestamp("cancel_at", { withTimezone: true }),
  canceledAt: timestamp("canceled_at", { withTimezone: true }),
  endedAt: timestamp("ended_at", { withTimezone: true }),
  bundlePurchaseId: text("bundle_purchase_id").references(() => bundlePurchases.id, { onDelete: "set null" }),
  bundleComponentId: text("bundle_component_id").references(() => bundleComponents.id, { onDelete: "restrict" }),
  created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
  index("member_subscription_addons_subscription_status_idx").on(table.memberSubscriptionId, table.status),
  index("member_subscription_addons_next_bill_idx").on(table.nextBillAt),
  index("member_subscription_addons_bundle_purchase_idx").on(table.bundlePurchaseId),
  index("member_subscription_addons_bundle_component_idx").on(table.bundleComponentId),
  check("member_subscription_addons_paid_period_order", sql`${table.paidPeriodEndsAt} is null or ${table.paidPeriodStartsAt} is null or ${table.paidPeriodEndsAt} >= ${table.paidPeriodStartsAt}`),
]);
