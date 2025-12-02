import { relations, sql } from "drizzle-orm";
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
import { planPrograms } from "./programs";

import type { BillingCycleAnchorConfig } from "@/types";
import { groups } from "./chat/groups";
import {
	IntervalType,
	LocationStatusEnum,
	PackageStatusEnum,
	PaymentTypeEnum,
	PlanType,
} from "./DatabaseEnums";
import { locations } from "./locations";
import { memberContracts, memberInvoices, members } from "./members";
import { recurringReservations, reservations } from "./reservations";

export const memberPlans = pgTable("member_plans", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	name: text("name").notNull(),
	description: text("description").notNull().default(""),
	family: boolean("family").notNull().default(false),
	familyMemberLimit: integer("family_member_limit").notNull().default(0),
	archived: boolean("archived").notNull().default(false),
	contractId: integer("contract_id").references(() => contractTemplates.id),
	interval: IntervalType("interval").default("month"),
	intervalThreshold: integer("interval_threshold").default(1),
	type: PlanType("type").notNull().default("recurring"),
	currency: text("currency").notNull().default("USD"),
	price: integer("price").notNull().default(0),
	stripePriceId: text("stripe_price_id"),
	totalClassLimit: integer("total_class_limit"),
	classLimitInterval: IntervalType("class_limit_interval"),
	classLimitThreshold: integer("class_limit_threshold"),
	expireInterval: IntervalType("expire_interval"),
	expireThreshold: integer("expire_threshold"),
	billingAnchorConfig: jsonb("billing_anchor_config").$type<BillingCycleAnchorConfig>().default(sql`'{}'::jsonb`),
	allowProration: boolean("allow_proration").notNull().default(false),
	groupId: text("group_id").references(() => groups.id, { onDelete: "set null" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const memberSubscriptions = pgTable("member_subscriptions", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	parentId: text("parent_id"),
	memberPlanId: text("member_plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
	memberContractId: text("member_contract_id").references(() => memberContracts.id, { onDelete: "set null" }),
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
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
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
	memberPlanId: text("member_plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	memberContractId: text("member_contract_id").references(() => memberContracts.id, { onDelete: "set null" }),
	stripePaymentId: text("stripe_payment_id"),
	parentId: text("parent_id"),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	expireDate: timestamp("expire_date", { withTimezone: true }),
	status: PackageStatusEnum("status").notNull(),
	paymentType: PaymentTypeEnum("payment_type").notNull().default("cash"),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().default(sql`'{}'::jsonb`),
	totalClassAttended: integer("total_class_attended").notNull().default(0),
	totalClassLimit: integer("total_class_limit").notNull().default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
},
	(table) => [
		foreignKey({
			columns: [table.parentId],
			foreignColumns: [table.id],
			name: "parent_child_fk",
		}),
	]
);

export const memberPlansRelations = relations(memberPlans, ({ one, many }) => ({
	location: one(locations, {
		fields: [memberPlans.locationId],
		references: [locations.id],
	}),
	group: one(groups, {
		fields: [memberPlans.groupId],
		references: [groups.id],
	}),
	planPrograms: many(planPrograms),
	packages: many(memberPackages),
	subscriptions: many(memberSubscriptions),
}));

export const memberSubscriptionRelations = relations(memberSubscriptions, ({ one, many }) => ({
	member: one(members, {
		fields: [memberSubscriptions.memberId],
		references: [members.id],
		relationName: "payer",
	}),
	parent: one(memberSubscriptions, {
		fields: [memberSubscriptions.parentId],
		references: [memberSubscriptions.id],
		relationName: "childs",
	}),
	plan: one(memberPlans, {
		fields: [memberSubscriptions.memberPlanId],
		references: [memberPlans.id],
	}),
	location: one(locations, {
		fields: [memberSubscriptions.locationId],
		references: [locations.id],
	}),
	contract: one(memberContracts, {
		fields: [memberSubscriptions.memberContractId],
		references: [memberContracts.id],
	}),
	childs: many(memberSubscriptions, {
		relationName: "childs",
	}),
	invoices: many(memberInvoices),
	reservations: many(reservations),
	recurrings: many(recurringReservations),
}));

export const memberPackagesRelations = relations(
	memberPackages,
	({ one, many }) => ({
		plan: one(memberPlans, {
			fields: [memberPackages.memberPlanId],
			references: [memberPlans.id],
		}),
		location: one(locations, {
			fields: [memberPackages.locationId],
			references: [locations.id],
		}),
		member: one(members, {
			fields: [memberPackages.memberId],
			references: [members.id],
		}),
		parent: one(memberPackages, {
			fields: [memberPackages.parentId],
			references: [memberPackages.id],
		}),
		contract: one(memberContracts, {
			fields: [memberPackages.memberContractId],
			references: [memberContracts.id],
		}),
		reservations: many(reservations),
		recurrings: many(recurringReservations),
		childs: many(memberPackages, {
			relationName: "children",
		}),
	})
);
