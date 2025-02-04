import { integer, boolean, text, timestamp, pgTable, serial, doublePrecision } from "drizzle-orm/pg-core";
import { programs } from "./programs";
import { contractsTemplates } from "./contract-templates";
import { relations } from "drizzle-orm";
import { vendors } from "./vendor";


export const plans = pgTable("member_plans", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    family: boolean("family").notNull().default(false),
    familyMemberLimit: integer("family_member_limit").notNull().default(0),
    status: boolean("status").notNull().default(false),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    contractId: integer("contract_id").references(() => contractsTemplates.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});


export const pricings = pgTable("member_plan_pricings", {
    id: serial("id").primaryKey(),
    amount: doublePrecision("amount").notNull(),
    billingPeriod: text("billing_period").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    memberPlanId: integer("member_plan_id").notNull().references(() => plans.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
});

export const pricingRelations = relations(pricings, ({ one }) => ({
    plan: one(plans, {
        fields: [pricings.memberPlanId],
        references: [plans.id],
    }),
}))

export const plansRelations = relations(plans, ({ one, many }) => ({
    program: one(programs, {
        fields: [plans.programId],
        references: [programs.id],
    }),
    contract: one(contractsTemplates, {
        fields: [plans.contractId],
        references: [contractsTemplates.id],
    }),
    pricing: one(pricings, {
        fields: [plans.id],
        references: [pricings.memberPlanId],
    })
}))