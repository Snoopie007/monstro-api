import { relations, sql } from "drizzle-orm";
import { boolean, text, timestamp, pgTable, uuid } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { memberContracts } from "./members";
import { memberPlans } from "./MemberPlans";
import { ContractTypeEnum } from "./DatabaseEnums";

export const contractTemplates = pgTable("contracts", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade", onUpdate: "cascade" }),
	content: text("content"),
	title: text("title").notNull(),
	description: text("description").notNull(),
	isDraft: boolean("is_draft").notNull().default(false),
	editable: boolean("editable").notNull().default(true),
	requireSignature: boolean("require_signature").notNull().default(false),
	type: ContractTypeEnum("type").notNull().default("contract"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const contractTemplateRelations = relations(
	contractTemplates,
	({ many, one }) => ({
		memberContracts: many(memberContracts),
		plans: many(memberPlans),
		location: one(locations, {
			fields: [contractTemplates.locationId],
			references: [locations.id],
		}),
	})
);
