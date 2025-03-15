import { relations } from "drizzle-orm";
import { boolean, serial, text, timestamp, pgTable, integer } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { memberContracts } from "./members";
import { memberPlans } from "./MemberPlans";

export const contractTemplates = pgTable("contracts", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    content: text("content"),
    title: text("title"),
    description: text("description"),
    created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp("updated_at", { withTimezone: true }),
    deleted: timestamp("deleted_at", { withTimezone: true }),
    isDraft: boolean("is_draft").notNull().default(false),
    editable: boolean("editable").notNull().default(true),
    requireSignature: boolean("require_signature").notNull().default(true),
    type: text("type").default("contract"),
});

export const contractTemplateRelations = relations(contractTemplates, ({ many, one }) => ({
    memberContracts: many(memberContracts),
    plans: many(memberPlans),
    location: one(locations, {
        fields: [contractTemplates.locationId],
        references: [locations.id],
    }),
}));
