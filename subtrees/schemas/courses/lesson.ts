import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { courseChapters } from "./chapter";

export type LessonStatus = "draft" | "published" | "archived";

export const courseLessons = pgTable("course_lessons", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('les_')`),
	chapterId: text("chapter_id").notNull().references(() => courseChapters.id, { onDelete: "restrict" }),
	title: text("title").notNull(),
	summary: text("summary"),
	mdx: text("mdx").notNull().default(""),
	videoUrl: text("video_url"),
	sortOrder: integer("sort_order").notNull().default(0),
	status: text("status").$type<LessonStatus>().notNull().default("draft"),
	requiresEnrollment: boolean("requires_enrollment").notNull().default(true),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	videoDuration: integer("video_duration_seconds").default(0),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	uniqueIndex("course_lessons_chapter_sort_order_active_unique").on(t.chapterId, t.sortOrder).where(sql`${t.status} <> 'archived'`),
	index("course_lessons_chapter_idx").on(t.chapterId),
	check("course_lessons_sort_order_nonnegative", sql`${t.sortOrder} >= 0`),
	check("course_lessons_status_check", sql`${t.status} in ('draft', 'published', 'archived')`),
]);
