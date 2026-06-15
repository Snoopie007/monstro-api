import { sql } from "drizzle-orm";
import {
	index,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { EventRegistrationStatusEnum } from "../DatabaseEnums";
import { locations } from "../locations";
import { members } from "../members";
import { transactions } from "../transactions";
import { locationEvents } from "./LocationEvents";

export const eventRegistrations = pgTable("event_registrations", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	eventId: text("event_id").notNull().references(() => locationEvents.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	status: EventRegistrationStatusEnum("status").notNull().default("registered"),
	transactionId: text("transaction_id").unique().references(() => transactions.id, { onDelete: "set null" }),
	paymentMethodId: text("payment_method_id"),
	registeredAt: timestamp("registered_at", { withTimezone: true }).notNull().defaultNow(),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("event_registrations_event_id_idx").on(t.eventId),
	index("event_registrations_member_location_idx").on(t.memberId, t.locationId),
	uniqueIndex("event_registrations_event_member_active_uq")
		.on(t.eventId, t.memberId)
		.where(sql`${t.status} in ('registered', 'waitlisted')`),
]);
