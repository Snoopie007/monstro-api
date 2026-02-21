import { sql } from "drizzle-orm";
import {
	boolean,
	foreignKey,
	integer,
	jsonb,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { contractTemplates } from "./contracts";
import { promos } from "./promos";

import type { BillingCycleAnchorConfig } from "../types";
import { groups } from "./chat/groups";
import {
	IntervalType,
	LocationStatusEnum,
	PackageStatusEnum,
	PaymentTypeEnum,
	PlanType,
} from "./DatabaseEnums";
import { locations } from "./locations";
import { memberContracts, members } from "./members";

export const memberPlans = pgTable("member_plans", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	family: boolean("family").notNull().default(false),
	familyMemberLimit: integer("family_member_limit").notNull().default(0),
	archived: boolean("archived").notNull().default(false),
	contractId: text("contract_id").references(() => contractTemplates.id),
	type: PlanType("type").notNull().default("recurring"),
	currency: text("currency").notNull().default("USD"),
	totalClassLimit: integer("total_class_limit"),
	classLimitInterval: text("class_limit_interval", { enum: ["week", "month", "term"] }),
	billingAnchorConfig: jsonb("billing_anchor_config").$type<BillingCycleAnchorConfig>().default(sql`'{}'::jsonb`),
	allowProration: boolean("allow_proration").notNull().default(false),
	makeUpCredits: integer("make_up_credits").notNull().default(0),
	groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberPlanPricing = pgTable("member_plan_pricing", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberPlanId: text("member_plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	price: integer("price").notNull().default(0),
	currency: text("currency").notNull().default("USD"),
	interval: IntervalType("interval").default("month"),
	intervalThreshold: integer("interval_threshold").default(1),
	expireInterval: IntervalType("expire_interval"),
	expireThreshold: integer("expire_threshold"),
	downpayment: integer("downpayment"),
	stripePriceId: text("stripe_price_id"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberSubscriptions = pgTable("member_subscriptions", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	parentId: text("parent_id"),
	memberPlanPricingId: text("member_plan_pricing_id").notNull().references(() => memberPlanPricing.id, { onDelete: "set null" }),
	memberContractId: text("member_contract_id").references(() => memberContracts.id, { onDelete: "set null" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	status: LocationStatusEnum("status").notNull().default("incomplete"),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
	cancelAt: timestamp("cancel_at", { withTimezone: true }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
	trialEnd: timestamp("trial_end", { withTimezone: true }),
	endedAt: timestamp("ended_at", { withTimezone: true }),
	classCredits: integer("class_credits").notNull().default(0),
	paymentType: PaymentTypeEnum("payment_type").notNull().default("cash"),
	stripePaymentId: text("stripe_payment_id"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	makeUpCredits: integer("make_up_credits").notNull().default(0),
	allowMakeUpCarryOver: boolean("allow_make_up_carry_over").notNull().default(false),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
	promoId: text("promo_id").references(() => promos.id, { onDelete: "set null" }),
},
	(table) => [
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "parent_child_fk",
		}),
	]
);

export const memberPackages = pgTable("member_packages", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberPlanPricingId: text("member_plan_pricing_id").notNull().references(() => memberPlanPricing.id, { onDelete: "set null" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	memberContractId: text("member_contract_id").references(() => memberContracts.id, { onDelete: "set null" }),
	stripePaymentId: text("stripe_payment_id"),
	parentId: text("parent_id"),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	expireDate: timestamp("expire_date", { withTimezone: true }),
	status: PackageStatusEnum("status").notNull(),
	paymentType: PaymentTypeEnum("payment_type").notNull().default("cash"),
	termsLeft: integer("terms_left").notNull().default(0),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
	totalClassAttended: integer("total_class_attended").notNull().default(0),
	totalClassLimit: integer("total_class_limit").notNull().default(0),
	makeUpCredits: integer("make_up_credits").notNull().default(0),
	allowMakeUpCarryOver: boolean("allow_make_up_carry_over").notNull().default(false),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
	promoId: text("promo_id").references(() => promos.id, { onDelete: "set null" }),
},
	(table) => [
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "parent_child_fk",
		}),
	]
);
