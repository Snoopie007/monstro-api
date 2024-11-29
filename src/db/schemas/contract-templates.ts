
import { desc, relations } from "drizzle-orm";
import { integer, boolean, primaryKey, varchar, serial, text, timestamp, pgTable, jsonb } from "drizzle-orm/pg-core";
import { vendors } from "./users";
import { locations } from "./locations";
import { contracts } from "./members";

export const contractsTemplates = pgTable("contracts", {
    id: serial("id").primaryKey(),
    vendorId: integer("vendor_id").references(() => vendors.id, { onDelete: "cascade" }),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade" }),
    content: text("content"),
    description: text("description"),
    title: varchar("title"),
    isDraft: boolean("isDraft").notNull().default(true),
    editable: boolean("editable").notNull().default(true),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const contractRelations = relations(contractsTemplates, ({ many, one }) => ({
    memberContracts: many(contracts)
}));