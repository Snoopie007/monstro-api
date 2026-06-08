import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locations } from "../locations";

export const rankProcesses = pgTable("rank_processes", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	isArchived: boolean("is_archived").notNull().default(false),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("rank_processes_location_id_idx").on(t.locationId),
]);
