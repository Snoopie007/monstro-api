import { sql } from "drizzle-orm";
import { boolean, check, index, integer, jsonb, pgTable, text, timestamp, unique, uniqueIndex } from "drizzle-orm/pg-core";
import { courseChapters } from "./chapter";

export type LessonStatus = "draft" | "published" | "archived";
export const courseLessons = pgTable("course_lessons", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('les_')`),
	chapterId: text("chapter_id").notNull().references(() => courseChapters.id, { onDelete: "restrict" }),
	title: text("title").notNull(),
	summary: text("summary"),
	mdx: text("mdx").notNull().default(""),
	videoObjectKey: text("video_object_key"),
	videoThumbnail: text("video_thumbnail"),
	videoDurationSeconds: integer("video_duration_seconds"),
	sortOrder: integer("sort_order").notNull().default(0),
	status: text("status").$type<LessonStatus>().notNull().default("draft"),
	requiresEnrollment: boolean("requires_enrollment").notNull().default(true),
	metadata: jsonb("metadata").$type<Record<string, unknown>>().notNull().default(sql`'{}'::jsonb`),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
	updated: timestamp("updated_at", { withTimezone: true }),
}, (t) => [
	uniqueIndex("course_lessons_chapter_sort_order_active_unique").on(t.chapterId, t.sortOrder).where(sql`${t.status} <> 'archived'`),
	index("course_lessons_chapter_idx").on(t.chapterId),
	check("course_lessons_sort_order_nonnegative", sql`${t.sortOrder} >= 0`),
	check("course_lessons_status_check", sql`${t.status} in ('draft', 'published', 'archived')`),
	check("course_lessons_video_duration_nonnegative", sql`${t.videoDurationSeconds} is null or ${t.videoDurationSeconds} >= 0`),
]);


export const courseLessonAttachments = pgTable("course_lesson_attachments", {
	id: text("id").primaryKey().notNull().default(sql`uuid_base62('att_')`),
	lessonId: text("lesson_id").notNull().references(() => courseLessons.id, { onDelete: "cascade" }),
	objectKey: text("object_key").notNull(),
	fileName: text("file_name").notNull(),
	contentType: text("content_type").notNull(),
	sizeBytes: integer("size_bytes").notNull(),
	created: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
	unique("course_lesson_attachments_object_key_unique").on(t.objectKey),
	index("course_lesson_attachments_lesson_created_idx").on(t.lessonId, t.created, t.id),
	check("course_lesson_attachments_file_name_check", sql`char_length(btrim(${t.fileName})) between 1 and 255`),
	check("course_lesson_attachments_size_bytes_check", sql`${t.sizeBytes} between 1 and 26214400`),
]);