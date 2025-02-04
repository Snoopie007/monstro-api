
import { relations } from "drizzle-orm";
import { integer, boolean, varchar, serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";
import { vendors } from "./vendor";
import { locations } from "./locations";
import { memberContracts } from "./members";
import { memberPlans } from "./member-plans";

export const contractsTemplates = pgTable("contracts", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    content: text("content"),
    title: varchar("title"),
    isDraft: boolean("isDraft").notNull().default(true),
    editable: boolean("editable").notNull().default(true),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const contractTemplateRelations = relations(contractsTemplates, ({ many, one }) => ({
    memberContracts: many(memberContracts),
    plans: many(memberPlans)
}));