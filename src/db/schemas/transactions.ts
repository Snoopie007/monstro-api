import { integer, numeric, serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { relations } from "drizzle-orm";
import { memberPlans } from "./member-plans";
import { members } from "./members";
import { vendors } from "./vendor";
import { programs } from "./programs";


export const transactions = pgTable("transactions", {
    id: serial("id").primaryKey(),
    description: text("description").notNull(),
    statementDescription: text("statement_description").notNull(),
    paymentMethod: text("payment_method").notNull(),
    direction: text("transaction_type").notNull(),
    type: text("payment_type").notNull(),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    status: text("status").notNull(),
    model: text("model").notNull(),
    programId: integer("program_id").references(() => programs.id, { onDelete: "cascade" }),
    memberPlanId: integer("member_plan_id").references(() => memberPlans.id, { onDelete: "cascade" }),
    memberId: integer("member_id").references(() => members.id, { onDelete: "cascade" }),

    vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
});


export const transactionsRelations = relations(transactions, ({ one }) => ({
    member: one(members, {
        fields: [transactions.memberId],
        references: [members.id],
    }),
    vendor: one(vendors, {
        fields: [transactions.vendorId],
        references: [vendors.id],
    }),
    location: one(locations, {
        fields: [transactions.locationId],
        references: [locations.id],
    }),
    memberPlan: one(memberPlans, {
        fields: [transactions.memberPlanId],
        references: [memberPlans.id],
    }),
}));

