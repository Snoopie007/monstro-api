import { sql } from "drizzle-orm";
import {
	boolean,
	index,
	integer,
	pgTable,
	primaryKey,
	smallint,
	text,
	time,
	timestamp,
	uniqueIndex,
	uuid,
} from "drizzle-orm/pg-core";
import { ReservationStatusEnum } from "./DatabaseEnums";
import { memberPackages, memberSubscriptions } from "./MemberEnrollment";
import { locations } from "./locations";
import { members } from "./members";
import { programSessions, programs } from "./programs";
import { staffs } from "./staffs";


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
	sessionDuration: integer("session_duration"),
	sessionDay: smallint("session_day"),
	staffId: text("staff_id").references(() => staffs.id, { onDelete: "set null" }),
	status: ReservationStatusEnum("status").notNull().default("confirmed"),
	cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
	cancelledReason: text("cancelled_reason"),
	isMakeUpClass: boolean("is_make_up_class").notNull().default(false),
	originalReservationId: text("original_reservation_id"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("idx_reservations_session_occurrence_active").on(t.sessionId, t.startOn).where(sql`${t.status} in ('confirmed', 'completed')`),
	uniqueIndex("reservations_member_session_occurrence_active_uq").on(t.memberId, t.sessionId, t.startOn).where(sql`${t.status} in ('confirmed', 'completed')`),
]);

export const memberAutoSchedule = pgTable("member_auto_schedule", {
	sessionId: text("session_id").notNull().references(() => programSessions.id, { onDelete: "cascade" }),
	jobKey: text("job_key").notNull(),
}, (t) => [primaryKey({ columns: [t.sessionId, t.jobKey] })]);
