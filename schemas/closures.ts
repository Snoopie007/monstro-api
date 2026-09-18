import { sql } from "drizzle-orm";
import { boolean, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { locations } from "./locations";

export const locationClosures = pgTable("location_closures", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('lcl_')`),
	locationId: text("location_id")
		.notNull()
		.references(() => locations.id, { onDelete: "cascade" }),
	startsAt: timestamp("starts_at", { withTimezone: true }),
	endsAt: timestamp("ends_at", { withTimezone: true }),
	recurrencePattern: text("recurrence_pattern"),
	allDay: boolean("all_day").notNull().default(false),
	reason: text("reason").notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
