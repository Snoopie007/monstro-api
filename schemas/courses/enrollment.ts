import { sql } from "drizzle-orm";
import { text, timestamp, pgTable, foreignKey, unique, index, primaryKey } from "drizzle-orm/pg-core";
import { courses } from "./course";
import { members } from "../members";
import { locations } from "../locations";
import { transactions } from "../transactions";
import { memberLocations } from "../MemberLocation";

export const courseEnrollments = pgTable("course_enrollments", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('cen_')`),
	courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	transactionId: text("transaction_id"),
	enrolledAt: timestamp("enrolled_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
	foreignKey({
		name: "course_enrollments_member_location_fk",
		columns: [t.memberId, t.locationId],
		foreignColumns: [memberLocations.memberId, memberLocations.locationId],
	}).onDelete("cascade"),
	foreignKey({
		name: "course_enrollments_transaction_fk",
		columns: [t.transactionId],
		foreignColumns: [transactions.id],
	}).onDelete("set null"),
	unique("course_enrollments_course_member_unique").on(t.courseId, t.memberId),
	index("course_enrollments_member_location_idx").on(t.memberId, t.locationId),
	index("course_enrollments_transaction_idx").on(t.transactionId).where(sql`${t.transactionId} is not null`),
]);
