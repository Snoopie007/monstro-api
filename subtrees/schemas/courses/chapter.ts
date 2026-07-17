import { sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { check, integer, jsonb, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { courses } from "./course";

export const courseChapters = pgTable("course_chapters", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('chp_')`),
	courseId: text("course_id").notNull().references(() => courses.id, { onDelete: "cascade" }),
	title: text("title").notNull(),
	sortOrder: integer("sort_order").notNull().default(0),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	unique("course_chapters_course_sort_order_unique").on(t.courseId, t.sortOrder),
	check("course_chapters_sort_order_nonnegative", sql`${t.sortOrder} >= 0`),
]);

