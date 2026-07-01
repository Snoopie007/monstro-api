import { sql } from "drizzle-orm";
import {
	boolean,
	integer,
	jsonb,
	pgTable,
	smallint,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { contractTemplates } from "./contracts";
import type { BillingCycleAnchorConfig } from "../types";
import { groups } from "./chat/groups";
import {
	ClassLimitIntervalEnum,
	IntervalType,
	PlanType,
} from "./DatabaseEnums";
import { locations } from "./locations";

export const memberPlans = pgTable("member_plans", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	family: boolean("family").notNull().default(false),
	familyMemberLimit: integer("family_member_limit").notNull().default(0),
	editable: boolean("editable").notNull().default(true),
	archived: boolean("archived").notNull().default(false),
	contractId: text("contract_id").references(() => contractTemplates.id),
	type: PlanType("type").notNull(),
	totalClassLimit: integer("total_class_limit"),
	classLimitInterval: ClassLimitIntervalEnum("class_limit_interval"),
	billingAnchorConfig: jsonb("billing_anchor_config").$type<BillingCycleAnchorConfig>().default(sql`'{}'::jsonb`),
	marketingDetails: jsonb("marketing_details").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	allowProration: boolean("allow_proration").notNull().default(false),
	classLimitThreshold: smallint("class_limit_threshold"),
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
	interval: IntervalType("interval").default("month"),
	intervalThreshold: integer("interval_threshold").default(1),
	expireInterval: IntervalType("expire_interval"),
	expireThreshold: integer("expire_threshold"),
	downpayment: integer("downpayment"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});
