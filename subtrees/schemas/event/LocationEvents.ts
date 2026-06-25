import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import type { EventStatus, EventType, VenueMode } from "../../types/DatabaseEnums";
import { locations } from "../locations";
import { staffs } from "../staffs";

export const locationEvents = pgTable("location_events", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('evt_')`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	summary: text("summary"),
	description: text("description"),
	image: text("image"),
	startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	capacity: integer("capacity"),
	eventType: text("event_type").$type<EventType>().notNull().default("in_person"),
	onlineUrl: text("online_url"),
	venueMode: text("venue_mode").$type<VenueMode>().notNull().default("location"),
	venueAddress: text("venue_address"),
	status: text("status").$type<EventStatus>().notNull().default("draft"),
	createdBy: text("created_by").references(() => staffs.id, { onDelete: "set null" }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("location_events_location_status_starts_idx").on(t.locationId, t.status, t.startsAt),
	check(
		"location_events_event_type_check",
		sql`${t.eventType} in ('in_person', 'online')`,
	),
	check(
		"location_events_venue_mode_check",
		sql`${t.venueMode} in ('location', 'custom')`,
	),
	check(
		"location_events_status_check",
		sql`${t.status} in ('draft', 'published', 'cancelled', 'archived')`,
	),
]);
