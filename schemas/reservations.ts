import { relations, sql } from "drizzle-orm";
import {
	integer,
	timestamp,
	pgTable,
	date,
	uuid,
	text,
	time,
	smallint,
	boolean,
} from "drizzle-orm/pg-core";
import { programSessions, programs } from "./programs";
import { members } from "./members";
import { attendances } from "./attendances";
import { memberPackages, memberSubscriptions } from "./MemberPlans";
import { locations } from "./locations";
import { staffs } from "./staffs";
import { IntervalType, ReservationStatusEnum, ExceptionInitiatorEnum } from "./DatabaseEnums";


export const reservations = pgTable("reservations", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	sessionId: text("session_id").references(() => programSessions.id, { onDelete: "set null" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	memberSubscriptionId: text("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
	memberPackageId: text("member_package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	startOn: timestamp("start_on", { withTimezone: true }).notNull(),
	endOn: timestamp("end_on", { withTimezone: true }).notNull(),
	programId: text("program_id").references(() => programs.id, { onDelete: "set null" }),
	programName: text("program_name"),
	sessionTime: time("session_time"),
	sessionDuration: smallint("session_duration"),
	sessionDay: smallint("session_day"),
	staffId: text("staff_id").references(() => staffs.id, { onDelete: "set null" }),
	status: ReservationStatusEnum("status").notNull().default("confirmed"),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
	cancelledReason: text("cancelled_reason"),

	isMakeUpClass: boolean("is_make_up_class").notNull().default(false),
	originalReservationId: text("original_reservation_id"),

	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

export const recurringReservations = pgTable("recurring_reservations", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	// Session reference - nullable for flexibility
	sessionId: text("session_id").references(() => programSessions.id, { onDelete: "set null" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	startDate: timestamp("start_date", { withTimezone: true }).notNull(),
	canceledOn: date("canceled_on"),
	memberSubscriptionId: text("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "cascade" }),
	memberPackageId: text("member_package_id").references(() => memberPackages.id, { onDelete: "cascade" }),
	interval: IntervalType("interval").notNull().default("week"),
	intervalThreshold: integer("interval_threshold").notNull().default(1),

	// Denormalized session/program fields
	programId: text("program_id").references(() => programs.id, { onDelete: "set null" }),
	programName: text("program_name"),
	sessionTime: time("session_time"),
	sessionDuration: smallint("session_duration"),
	sessionDay: smallint("session_day"),
	staffId: text("staff_id").references(() => staffs.id, { onDelete: "set null" }),

	// Status tracking
	status: ReservationStatusEnum("status").notNull().default("confirmed"),

	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
});

// Unified reservation exceptions table - supports both recurring and single reservations
// Also supports location-wide blocks (holidays, maintenance)
export const reservationExceptions = pgTable("reservation_exceptions", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	// Can apply to specific reservations - nullable for flexibility
	reservationId: text("reservation_id").references(() => reservations.id, { onDelete: "cascade" }),
	recurringReservationId: text("recurring_reservation_id").references(() => recurringReservations.id, { onDelete: "cascade" }),
	// For location-wide blocking (holidays, maintenance)
	locationId: text("location_id").references(() => locations.id, { onDelete: "cascade" }),
	sessionId: text("session_id").references(() => programSessions.id, { onDelete: "cascade" }),
	// Exception details
	occurrenceDate: timestamp("occurrence_date", { withTimezone: true }).notNull(),
	endDate: timestamp("end_date", { withTimezone: true }), // For multi-day blocks
	initiator: ExceptionInitiatorEnum("initiator").notNull().default("member"),
	reason: text("reason"),
	// Track who created it
	createdBy: text("created_by").references(() => staffs.id, { onDelete: "set null" }),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const reservationsRelations = relations(reservations, ({ one, many }) => ({
	attendances: many(attendances),
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
	program: one(programs, {
		fields: [reservations.programId],
		references: [programs.id],
	}),
	staff: one(staffs, {
		fields: [reservations.staffId],
		references: [staffs.id],
	}),
	originalReservation: one(reservations, {
		fields: [reservations.originalReservationId],
		references: [reservations.id],
		relationName: "makeUpReservations",
	}),
	exceptions: many(reservationExceptions, {
		relationName: "reservationExceptions",
	}),
}));

export const recurringReservationsRelations = relations(recurringReservations, ({ one, many }) => ({
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
	program: one(programs, {
		fields: [recurringReservations.programId],
		references: [programs.id],
	}),
	staff: one(staffs, {
		fields: [recurringReservations.staffId],
		references: [staffs.id],
	}),
	exceptions: many(reservationExceptions, {
		relationName: "recurringReservationExceptions",
	}),
	attendances: many(attendances),
})
);

export const reservationExceptionsRelations = relations(
	reservationExceptions,
	({ one }) => ({
		reservation: one(reservations, {
			fields: [reservationExceptions.reservationId],
			references: [reservations.id],
			relationName: "reservationExceptions",
		}),
		recurringReservation: one(recurringReservations, {
			fields: [reservationExceptions.recurringReservationId],
			references: [recurringReservations.id],
			relationName: "recurringReservationExceptions",
		}),
		location: one(locations, {
			fields: [reservationExceptions.locationId],
			references: [locations.id],
		}),
		session: one(programSessions, {
			fields: [reservationExceptions.sessionId],
			references: [programSessions.id],
		}),
		createdByStaff: one(staffs, {
			fields: [reservationExceptions.createdBy],
			references: [staffs.id],
		}),
	})
);
