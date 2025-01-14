import { integer, boolean, text, timestamp, pgTable, serial } from "drizzle-orm/pg-core";
import { programs } from "./programs";
import { contractsTemplates } from "./contract-templates";
import { relations } from "drizzle-orm";
import { vendors } from "./vendor";
import { pricings } from "./pricing";

export const plans = pgTable("stripe_plans", {
    id: serial("id").primaryKey(),
    name: text("name").notNull(),
    description: text("description"),
    family: boolean("family").notNull().default(false),
    familyMemberLimit: integer("family_member_limit").notNull().default(0),
    status: boolean("status").notNull().default(false),
    vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    contractId: integer("contract_id").references(() => contractsTemplates.id),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const plansRelations = relations(plans, ({ one }) => ({
    program: one(programs, {
        fields: [plans.programId],
        references: [programs.id],
    }),
    contract: one(contractsTemplates, {
        fields: [plans.contractId],
        references: [contractsTemplates.id],
    }),
    pricings: one(pricings)
}))