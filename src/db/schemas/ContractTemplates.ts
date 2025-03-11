
import { relations } from "drizzle-orm";
import { integer, boolean, varchar, serial, text, timestamp, pgTable } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { memberContracts } from "./members";
import { memberPlans } from "./MemberPlans";
import { ContractTypeEnum } from "./enums";

export const contractTemplates = pgTable("contracts", {
    id: serial("id").primaryKey(),
    locationId: integer("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    title: varchar("title").notNull(),
    description: text("description"),
    isDraft: boolean("is_draft").notNull().default(true),
    editable: boolean("editable").notNull().default(true),
    requireSignature: boolean("require_signature").notNull().default(false),
    type: ContractTypeEnum("type").notNull().default("contract"),
    created: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
    updated: timestamp('updated_at', { withTimezone: true }),
    deleted: timestamp('deleted_at', { withTimezone: true })
});

export const contractTemplateRelations = relations(contractTemplates, ({ many, one }) => ({
    memberContracts: many(memberContracts),
    plans: many(memberPlans)
}));