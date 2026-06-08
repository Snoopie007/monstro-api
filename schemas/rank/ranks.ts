import { sql } from "drizzle-orm";
import { boolean, index, integer, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { locations } from "../locations";
import { rankProcesses } from "./rankProcesses";

export const ranks = pgTable("ranks", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	processId: text("process_id").notNull().references(() => rankProcesses.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description").notNull(),
	badge: text("badge").notNull(),
	sortOrder: integer("sort_order").notNull(),
	isArchived: boolean("is_archived").notNull().default(false),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("ranks_process_id_sort_order_idx").on(t.processId, t.sortOrder),
	index("ranks_location_id_idx").on(t.locationId),
]);
