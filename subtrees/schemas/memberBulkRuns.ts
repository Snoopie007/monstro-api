import { sql } from "drizzle-orm";
import { index, integer, jsonb, pgEnum, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { locations } from "./locations";
import { members } from "./members";

export const MemberBulkActionEnum = pgEnum("member_bulk_action", [
	"resend_invite",
	"register_event",
	"enroll_course",
	"charge",
	"archive",
]);

export const MemberBulkRunStatusEnum = pgEnum("member_bulk_run_status", [
	"queued",
	"running",
	"completed",
	"canceled",
]);

export const MemberBulkItemStatusEnum = pgEnum("member_bulk_item_status", [
	"pending",
	"processing",
	"succeeded",
	"failed",
	"skipped",
	"needs_review",
	"canceled",
]);

/**
 * One bulk action a staff member started from the members list.
 * `input` holds what they chose once for everyone (event and ticket, course, or charge details).
 */
export const memberBulkRuns = pgTable("member_bulk_runs", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('bkr_')`),
	locationId: text("location_id").notNull().references(() => locations.id, { onDelete: "cascade" }),
	action: MemberBulkActionEnum("action").notNull(),
	input: jsonb("input").$type<Record<string, unknown>>().notNull().default({}),
	status: MemberBulkRunStatusEnum("status").notNull().default("queued"),
	total: integer("total").notNull(),
	createdBy: text("created_by").notNull(),
	createdByName: text("created_by_name"),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	started: timestamp("started_at", { withTimezone: true }),
	finished: timestamp("finished_at", { withTimezone: true }),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	index("member_bulk_runs_location_created_idx").on(t.locationId, t.created),
]);

/**
 * One member's result within a bulk run. The worker takes a pending row, runs the member's
 * action once and saves the result here. A row left in progress by a stopped worker is closed
 * as interrupted, not run again.
 */
export const memberBulkRunItems = pgTable("member_bulk_run_items", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('bki_')`),
	runId: text("run_id").notNull().references(() => memberBulkRuns.id, { onDelete: "cascade" }),
	memberId: text("member_id").notNull().references(() => members.id, { onDelete: "cascade" }),
	status: MemberBulkItemStatusEnum("status").notNull().default("pending"),
	code: text("code"),
	message: text("message"),
	details: jsonb("details").$type<Record<string, unknown>>().notNull().default({}),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	finished: timestamp("finished_at", { withTimezone: true }),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	uniqueIndex("member_bulk_run_items_run_member_idx").on(t.runId, t.memberId),
]);
