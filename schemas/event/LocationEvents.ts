import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	text,
	timestamp,
	uuid,
} from "drizzle-orm/pg-core";
import { EventStatusEnum } from "../DatabaseEnums";
import type { Currency } from "../../types/currency";
import { locations } from "../locations";
import { staffs } from "../staffs";

export const locationEvents = pgTable("location_events", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	name: text("name").notNull(),
	description: text("description"),
	image: text("image"),
	startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	capacity: integer("capacity"),
	allowWaitlist: boolean("allow_waitlist").notNull().default(false),
	registrationOpensAt: timestamp("registration_opens_at", { withTimezone: true }),
	registrationClosesAt: timestamp("registration_closes_at", { withTimezone: true }),
	price: integer("price"),
	currency: text("currency").$type<Currency>().notNull().default("USD"),
	status: EventStatusEnum("status").notNull().default("draft"),
	staffId: text("staff_id").references(() => staffs.id, { onDelete: "set null" }),
	createdBy: text("created_by").references(() => staffs.id, { onDelete: "set null" }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("location_events_location_status_starts_idx").on(t.locationId, t.status, t.startsAt),
]);
