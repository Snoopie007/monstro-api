import { integer, boolean, text, timestamp, pgTable, serial, doublePrecision, pgEnum, jsonb, uuid } from "drizzle-orm/pg-core";
import { programLevels, programs } from "./programs";
import { contractTemplates } from "./ContractTemplates";
import { relations, sql } from "drizzle-orm";

import { memberInvoices, members } from "./members";
import { locations } from "./locations";
import { transactions } from "./transactions";
import { reservations } from "./reservations";
import { BillingCycleAnchorConfig } from "@/types";
import { LocationStatusEnum, PackageStatusEnum, PaymentMethodEnum, PlanInterval, PlanType } from "./Enums";


export const memberPlans = pgTable("member_plans", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    family: boolean("family").notNull().default(false),
    familyMemberLimit: integer("family_member_limit").notNull().default(0),
    archived: boolean("archived").notNull().default(false),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    contractId: integer("contract_id").references(() => contractTemplates.id),
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
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});


export const memberSubscriptions = pgTable("member_subscriptions", {
    id: serial("id").primaryKey(),
    payerId: integer("payer_id").references(() => members.id, { onDelete: "cascade" }),
    beneficiaryId: integer("beneficiary_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    memberPlanId: integer("member_plan_id").references(() => memberPlans.id, { onDelete: "cascade" }),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    programLevelId: integer("program_level_id").notNull().references(() => programLevels.id, { onDelete: "cascade" }),
    stripeSubscriptionId: text("stripe_subscription_id"),
    status: LocationStatusEnum("status").notNull().default("incomplete"),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    currentPeriodStart: timestamp("current_period_start", { withTimezone: true }).notNull(),
    currentPeriodEnd: timestamp("current_period_end", { withTimezone: true }).notNull(),
    cancelAt: timestamp("cancel_at", { withTimezone: true }),
    cancelAtPeriodEnd: boolean("cancel_at_period_end").notNull().default(false),
    trialEnd: timestamp("trial_end", { withTimezone: true }),
    endedAt: timestamp("ended_at", { withTimezone: true }),
    paymentMethod: PaymentMethodEnum("payment_method").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().notNull().default(sql`'{}'::jsonb`),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});



export const memberPackages = pgTable("member_packages", {
    id: uuid("id").primaryKey().defaultRandom(),
    memberPlanId: integer("member_plan_id").notNull().references(() => memberPlans.id, { onDelete: "cascade" }),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    payerId: integer("payer_id").references(() => members.id, { onDelete: "set null" }),
    beneficiaryId: integer("beneficiary_id").notNull().references(() => members.id, { onDelete: "cascade" }),
    programLevelId: integer("program_level_id").notNull().references(() => programLevels.id, { onDelete: "cascade" }),
    startDate: timestamp("start_date", { withTimezone: true }).notNull(),
    expireDate: timestamp("expire_date", { withTimezone: true }),
    status: PackageStatusEnum("status").notNull(),
    paymentMethod: PaymentMethodEnum("payment_method").notNull(),
    metadata: jsonb("metadata").$type<Record<string, any>>().default(sql`'{}'::jsonb`),
    totalClassAttended: integer("total_class_attended").notNull().default(0),
    totalClassLimit: integer("total_class_limit").notNull().default(0),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const memberPlansRelations = relations(memberPlans, ({ one, many }) => ({
    program: one(programs, {
        fields: [memberPlans.programId],
        references: [programs.id],
    }),
    contract: one(contractTemplates, {
        fields: [memberPlans.contractId],
        references: [contractTemplates.id],
    }),
    packages: many(memberPackages),
    subscriptions: many(memberSubscriptions),
}));

export const memberSubscriptionRelations = relations(memberSubscriptions, ({ one, many }) => ({
    payer: one(members, {
        fields: [memberSubscriptions.payerId],
        references: [members.id],
        relationName: "payer",
    }),
    beneficiary: one(members, {
        fields: [memberSubscriptions.beneficiaryId],
        references: [members.id],
        relationName: "beneficiary",
    }),

    programLevel: one(programLevels, {
        fields: [memberSubscriptions.programLevelId],
        references: [programLevels.id],
    }),
    plan: one(memberPlans, {
        fields: [memberSubscriptions.memberPlanId],
        references: [memberPlans.id],
    }),
    location: one(locations, {
        fields: [memberSubscriptions.locationId],
        references: [locations.id],
    }),
    transactions: many(transactions),
    invoices: many(memberInvoices),
    reservations: many(reservations),
}));

export const memberPackagesRelations = relations(memberPackages, ({ one, many }) => ({
    plan: one(memberPlans, {
        fields: [memberPackages.memberPlanId],
        references: [memberPlans.id],
    }),
    programLevel: one(programLevels, {
        fields: [memberPackages.programLevelId],
        references: [programLevels.id],
    }),
    location: one(locations, {
        fields: [memberPackages.locationId],
        references: [locations.id],
    }),
    payer: one(members, {
        fields: [memberPackages.payerId],
        references: [members.id],
        relationName: "packagePayer",
    }),
    beneficiary: one(members, {
        fields: [memberPackages.beneficiaryId],
        references: [members.id],
        relationName: "packageBeneficiary",
    }),
    transactions: many(transactions),
    invoices: many(memberInvoices),
    reservations: many(reservations),
}));
