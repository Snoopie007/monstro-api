import { sql } from "drizzle-orm";
import { check, date, index, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { PrivateReservationStatusEnum } from "./DatabaseEnums";
import { locations } from "./locations";
import { memberPackages, memberSubscriptions } from "./MemberEnrollment";
import { members } from "./members";
import { programSessions } from "./programs";

export const privateReservations = pgTable("private_reservations", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('pvr_')`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	sessionId: text("session_id").notNull().references(() => programSessions.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	memberPackageId: text("member_package_id").references(() => memberPackages.id, { onDelete: "restrict" }),
	memberSubscriptionId: text("member_subscription_id").references(() => memberSubscriptions.id, { onDelete: "restrict" }),
	startDate: date("start_date").notNull(),
	endDate: date("end_date").notNull(),
	status: PrivateReservationStatusEnum("status").notNull().default("active"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (table) => [
	check(
		"private_reservations_one_enrollment_check",
		sql`num_nonnulls(${table.memberPackageId}, ${table.memberSubscriptionId}) = 1`,
	),
	check(
		"private_reservations_date_range_check",
		sql`${table.endDate} >= ${table.startDate}`,
	),
	index("idx_private_reservations_location_status").on(table.locationId, table.status),
	index("idx_private_reservations_member_id").on(table.memberId),
	index("idx_private_reservations_active_session_dates")
		.on(table.sessionId, table.startDate, table.endDate)
		.where(sql`${table.status} = 'active'`),
	index("idx_private_reservations_package_id").on(table.memberPackageId),
	index("idx_private_reservations_subscription_id").on(table.memberSubscriptionId),
]);
