import { sql } from "drizzle-orm";
import { boolean, jsonb, text, timestamp, pgTable, uuid } from "drizzle-orm/pg-core";

import { locations } from "./locations";
import { ContractTypeEnum } from "./DatabaseEnums";

/** A box on an uploaded PDF template. Coordinates are PDF points on a 0-based page, origin at the bottom left.
 * `source` is a variable path filled when the document is created (`member.name`) or a `signing.*` box the signer fills. */
export type TemplateField = {
	id: string;
	page: number;
	x: number;
	y: number;
	width: number;
	height: number;
	source: string;
	label?: string;
};

export const contractTemplates = pgTable("contracts", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade", onUpdate: "cascade" }),
	content: text("content"),
	/** Set for an uploaded PDF template (its boxes); null for a written template. */
	fields: jsonb("fields").$type<TemplateField[]>(),
	title: text("title").notNull(),
	description: text("description").notNull(),
	isDraft: boolean("is_draft").notNull().default(false),
	editable: boolean("editable").notNull().default(true),
	requireSignature: boolean("require_signature").notNull().default(false),
	type: ContractTypeEnum("type").notNull().default("contract"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});
