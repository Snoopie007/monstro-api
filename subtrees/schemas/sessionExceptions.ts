import { sql } from "drizzle-orm";
import {
	boolean,
	check,
	date,
	index,
	pgTable,
	text,
	timestamp,
	unique,
} from "drizzle-orm/pg-core";
import { programSessions } from "./programs";

export const sessionExceptions = pgTable("session_exceptions", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('sxe_')`),
	sessionId: text("session_id")
		.notNull()
		.references(() => programSessions.id, { onDelete: "cascade" }),
	originalDate: date("original_date", { mode: "string" }).notNull(),
	startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
	endsAt: timestamp("ends_at", { withTimezone: true }).notNull(),
	isCancelled: boolean("is_cancelled").notNull().default(false),
	reason: text("reason").notNull(),
	createdBy: text("created_by").notNull(),
	createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	unique("session_exceptions_one_per_occurrence").on(t.sessionId, t.originalDate),
	index("session_exceptions_rescheduled_interval_idx")
		.on(t.sessionId, t.startsAt, t.endsAt)
		.where(sql`not ${t.isCancelled}`),
	check("session_exceptions_created_by_actor", sql`${t.createdBy} ~ '^(stf|vdr)_[A-Za-z0-9]+$'`),
	check("session_exceptions_reason_not_blank", sql`btrim(${t.reason}) <> ''`),
	check("session_exceptions_valid_interval", sql`${t.endsAt} > ${t.startsAt}`),
]);
