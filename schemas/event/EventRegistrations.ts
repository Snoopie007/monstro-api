import { sql } from "drizzle-orm";
import { check, index, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import type { EventRegistrationStatus } from "../../types/DatabaseEnums";
import { locations } from "../locations";
import { members } from "../members";
import { transactions } from "../transactions";
import { locationEvents } from "./LocationEvents";
import { eventTickets } from "./EventTickets";

export const eventRegistrations = pgTable("event_registrations", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('erg_')`),
	eventId: text("event_id").notNull().references(() => locationEvents.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	ticketId: text("ticket_id").notNull().references(() => eventTickets.id, { onDelete: "restrict" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	status: text("status").$type<EventRegistrationStatus>().notNull().default("registered"),
	transactionId: text("transaction_id").references(() => transactions.id, { onDelete: "set null" }),
	registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("event_registrations_event_id_idx").on(t.eventId),
	index("event_registrations_ticket_id_idx").on(t.ticketId),
	index("event_registrations_member_location_idx").on(t.memberId, t.locationId),
	uniqueIndex("event_registrations_event_member_active_uq")
		.on(t.eventId, t.memberId)
		.where(sql`${t.status} in ('registered', 'attended')`),
	check(
		"event_registrations_status_check",
		sql`${t.status} in ('registered', 'cancelled', 'attended')`,
	),
]);
