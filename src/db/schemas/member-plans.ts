import { integer, boolean, text, timestamp, pgTable, serial, doublePrecision } from "drizzle-orm/pg-core";
import { programs } from "./programs";
import { contractTemplates } from "./contract-templates";
import { relations } from "drizzle-orm";
import { vendors } from "./vendors";

export const memberPlans = pgTable("member_plans", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description").notNull().default(""),
    family: boolean("family").notNull().default(false),
    familyMemberLimit: integer("family_member_limit").notNull().default(0),
    status: boolean("status").notNull().default(false),
    vendorId: integer("vendor_id").notNull().references(() => vendors.id, { onDelete: "cascade" }),
    programId: integer("program_id").notNull().references(() => programs.id, { onDelete: "cascade" }),
    contractId: integer("contract_id").references(() => contractTemplates.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});


export const memberPlanPricings = pgTable("member_plan_pricings", {
    id: serial("id").primaryKey(),
    amount: doublePrecision("amount").notNull(),
    billingPeriod: text("billing_period").notNull(),
    stripePriceId: text("stripe_price_id").notNull(),
    memberPlanId: integer("member_plan_id").notNull().references(() => memberPlans.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),

});

export const memberPlanPricingsRelations = relations(memberPlanPricings, ({ one }) => ({
    plan: one(memberPlans, {
        fields: [memberPlanPricings.memberPlanId],
        references: [memberPlans.id],
    }),
}))


export const memberPlansRelations = relations(memberPlans, ({ one, many }) => ({
    program: one(programs, {
        fields: [memberPlans.programId],
        references: [programs.id],
    }),
    contract: one(contractTemplates, {
        fields: [memberPlans.contractId],
        references: [contractTemplates.id],
    }),
    pricing: one(memberPlanPricings, {
        fields: [memberPlans.id],
        references: [memberPlanPricings.memberPlanId],
    })


}))