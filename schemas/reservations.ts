import { sql } from "drizzle-orm";
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
import { memberPackages, memberSubscriptions } from "./MemberPlans";
import { locations } from "./locations";
import { staffs } from "./staffs";
import { ReservationStatusEnum, ExceptionInitiatorEnum } from "./DatabaseEnums";


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

// Unified reservation exceptions table - supports both recurring and single reservations
// Also supports location-wide blocks (holidays, maintenance)
export const reservationExceptions = pgTable("reservation_exceptions", {
	id: uuid("id").primaryKey().notNull().default(sql`uuid_base62()`),
	// Can apply to specific reservations - nullable for flexibility
	reservationId: text("reservation_id").references(() => reservations.id, { onDelete: "cascade" }),
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
