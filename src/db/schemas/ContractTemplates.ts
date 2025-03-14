import { relations } from "drizzle-orm";
import { bigint, boolean, varchar, serial, text, timestamp, pgTable, integer } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { memberContracts } from "./members";
import { memberPlans } from "./MemberPlans";
import { ContractTypeEnum } from "./enums";

export const contractTemplates = pgTable("contracts", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").references(() => locations.id, { onDelete: "cascade", onUpdate: "cascade" }),
    content: text("content"),
    title: varchar("title", { length: 255 }),
    description: text("description"),
    created: timestamp("created_at", { withTimezone: false }),
    updated: timestamp("updated_at", { withTimezone: false }),
    deleted: timestamp("deleted_at", { withTimezone: false }),
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
