// NOTE: This ecommerce schema is mirrored from monstro-monorepo/packages/schemas.
// The monstro-api subtree surface is owned separately; reconcile with the API owner
// before changing table shapes or export names.
import { sql } from "drizzle-orm";
import { boolean, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { locations } from "../locations";

export const products = pgTable("products", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('prd_')`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	slug: text("slug").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	brand: text("brand"),
	active: boolean("active").notNull().default(true),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	unique("products_location_slug_unique").on(t.locationId, t.slug),
]);
