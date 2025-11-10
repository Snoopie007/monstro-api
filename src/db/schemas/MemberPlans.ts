
import {
	integer,
	boolean,
	text,
	timestamp,
	pgTable,
	jsonb,
	unique,
	uuid,
} from "drizzle-orm/pg-core";
import { planPrograms } from "./programs";
import { contractTemplates } from "./contracts";
import { relations, sql } from "drizzle-orm";

import { memberInvoices, members, memberContracts } from "./members";
import { locations } from "./locations";
import { transactions } from "./transactions";
import { recurringReservations, reservations } from "./reservations";
import type { BillingCycleAnchorConfig } from "@/types";
import {
	LocationStatusEnum,
	PackageStatusEnum,
	PaymentTypeEnum,
	PlanInterval,
	PlanType,
} from "./DatabaseEnums";

export const memberPlans = pgTable("member_plans", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	family: boolean("family").notNull().default(false),
	familyMemberLimit: integer("family_member_limit").notNull().default(0),
	archived: boolean("archived").notNull().default(false),
	contractId: text("contract_id").references(() => contractTemplates.id),
	interval: PlanInterval("interval").default("month"),
	intervalThreshold: integer("interval_threshold").default(1),
	type: PlanType("type").notNull().default("recurring"),
	currency: text("currency").notNull().default("USD"),
	price: integer("price").notNull().default(0),
	stripePriceId: text("stripe_price_id"),
	totalClassLimit: integer("total_class_limit"),
	classLimitInterval: PlanInterval("class_limit_interval"),
	classLimitThreshold: integer("class_limit_threshold"),
	expireInterval: PlanInterval("expire_interval"),
	expireThreshold: integer("expire_threshold"),
	billingAnchorConfig: jsonb("billing_anchor_config").$type<BillingCycleAnchorConfig>().default(sql`'{}'::jsonb`),
	allowProration: boolean("allow_proration").notNull().default(false),
	locationId: text("location_id").notNull().references(() => locations.id),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberSubscriptions = pgTable("member_subscriptions", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	parentId: uuid("parent_id"),
	memberPlanId: text("member_plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
	memberContractId: text("member_contract_id").references(() => memberContracts.id),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	stripeSubscriptionId: text("stripe_subscription_id"),
	status: LocationStatusEnum("status").notNull().default("incomplete"),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
	currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
	cancelAt: timestamp("cancel_at", { withTimezone: true }),
	cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
	trialEnd: timestamp("trial_end", { withTimezone: true }),
	endedAt: timestamp("ended_at", { withTimezone: true }),
	paymentType: PaymentTypeEnum("payment_type").notNull().default("cash"),
	metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [unique().on(table.memberId, table.parentId)]);

export const memberPackages = pgTable("member_packages", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberPlanId: text("member_plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	memberContractId: text("member_contract_id").references(() => memberContracts.id),
	stripePaymentId: text("stripe_payment_id"),
	parentId: uuid("parent_id"),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	expireDate: timestamp("expire_date", { withTimezone: true }),
	status: PackageStatusEnum("status").notNull(),
	paymentType: PaymentTypeEnum("payment_type").notNull().default("cash"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
	totalClassAttended: integer("total_class_attended").notNull().default(0),
	totalClassLimit: integer("total_class_limit").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [unique().on(t.memberId, t.parentId)]);

export const memberPlansRelations = relations(memberPlans, ({ one, many }) => ({
	location: one(locations, { fields: [memberPlans.locationId], references: [locations.id] }),
	contract: one(contractTemplates, { fields: [memberPlans.contractId], references: [contractTemplates.id] }),
	planPrograms: many(planPrograms),
	packages: many(memberPackages),
	subscriptions: many(memberSubscriptions),
}));

export const memberSubscriptionRelations = relations(memberSubscriptions, ({ one, many }) => ({
	member: one(members, { fields: [memberSubscriptions.memberId], references: [members.id], relationName: "payer" }),
	parent: one(memberSubscriptions, { fields: [memberSubscriptions.parentId], references: [memberSubscriptions.id], relationName: "familyParent" }),
	plan: one(memberPlans, { fields: [memberSubscriptions.memberPlanId], references: [memberPlans.id] }),
	location: one(locations, { fields: [memberSubscriptions.locationId], references: [locations.id] }),
	contract: one(memberContracts, { fields: [memberSubscriptions.memberContractId], references: [memberContracts.id] }),
	transactions: many(transactions),
	invoices: many(memberInvoices),
	reservations: many(reservations),
	recurrings: many(recurringReservations),
	childs: many(memberSubscriptions, { relationName: "familyParent" }),
}));

export const memberPackagesRelations = relations(memberPackages, ({ one, many }) => ({
	plan: one(memberPlans, { fields: [memberPackages.memberPlanId], references: [memberPlans.id] }),
	location: one(locations, { fields: [memberPackages.locationId], references: [locations.id] }),
	member: one(members, { fields: [memberPackages.memberId], references: [members.id] }),
	parent: one(memberPackages, { fields: [memberPackages.parentId], references: [memberPackages.id], relationName: "familyParent" }),
	contract: one(memberContracts, { fields: [memberPackages.memberContractId], references: [memberContracts.id] }),
	transactions: many(transactions),
	invoices: many(memberInvoices),
	reservations: many(reservations),
	recurrings: many(recurringReservations),
	childs: many(memberPackages, { relationName: "familyParent" }),
}));
