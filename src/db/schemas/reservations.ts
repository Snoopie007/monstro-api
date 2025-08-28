import { relations, sql } from "drizzle-orm";
import { integer, timestamp, pgTable, date, unique, uuid, text } from "drizzle-orm/pg-core";
import { programSessions } from "./programs";
import { members } from "./members";
import { attendances } from "./attendances";
import { memberPackages, memberSubscriptions } from "./MemberPlans";
import { locations } from "./locations";
import { PlanInterval } from "./DatabaseEnums";


export const reservations = pgTable("reservations", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	sessionId: text("session_id").notNull().references(() => programSessions.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	memberSubscriptionId: text("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
	memberPackageId: text("member_package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	startOn: timestamp("start_on", { withTimezone: true }).notNull(),
	endOn: timestamp("end_on", { withTimezone: true }).notNull(),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const recurringReservations = pgTable("recurring_reservations", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	sessionId: text("session_id").notNull().references(() => programSessions.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	canceledOn: date("canceled_on"),
	memberSubscriptionId: text("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
	memberPackageId: text("member_package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
	interval: PlanInterval("interval").notNull().default("week"),
	intervalThreshold: integer("interval_threshold").notNull().default(1),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const recurringReservationsExceptions = pgTable("recurring_reservations_exceptions", {
	recurringReservationId: text("recurring_reservation_id").notNull().references(() => recurringReservations.id, { onDelete: "cascade" }),
	occurrenceDate: timestamp("occurrence_date", { withTimezone: true }).notNull(),
}, (t) => [unique("unique_exception_recurring").on(t.recurringReservationId, t.occurrenceDate)]);

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
	session: one(programSessions, {
		fields: [reservations.sessionId],
		references: [programSessions.id],
	}),
	member: one(members, {
		fields: [reservations.memberId],
		references: [members.id],
	}),
	memberSubscription: one(memberSubscriptions, {
		fields: [reservations.memberSubscriptionId],
		references: [memberSubscriptions.id],
	}),
	memberPackage: one(memberPackages, {
		fields: [reservations.memberPackageId],
		references: [memberPackages.id],
	}),
	location: one(locations, {
		fields: [reservations.locationId],
		references: [locations.id],
	}),
	attendance: one(attendances, {
		fields: [reservations.id],
		references: [attendances.reservationId],
	}),
}));

export const recurringReservationsRelations = relations(
	recurringReservations,
	({ one, many }) => ({
		session: one(programSessions, {
			fields: [recurringReservations.sessionId],
			references: [programSessions.id],
		}),
		location: one(locations, {
			fields: [recurringReservations.locationId],
			references: [locations.id],
		}),
		member: one(members, {
			fields: [recurringReservations.memberId],
			references: [members.id],
		}),
		memberSubscription: one(memberSubscriptions, {
			fields: [recurringReservations.memberSubscriptionId],
			references: [memberSubscriptions.id],
		}),
		memberPackage: one(memberPackages, {
			fields: [recurringReservations.memberPackageId],
			references: [memberPackages.id],
		}),
		exceptions: many(recurringReservationsExceptions),
		attendances: many(attendances),
	})
);

export const recurringReservationsExceptionsRelations = relations(
	recurringReservationsExceptions,
	({ one }) => ({
		recurring: one(recurringReservations, {
			fields: [recurringReservationsExceptions.recurringReservationId],
			references: [recurringReservations.id],
		}),
	})
);
