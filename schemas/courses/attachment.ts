import { sql, type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { check, index, integer, pgTable, text, timestamp, unique } from "drizzle-orm/pg-core";
import { courseLessons } from "./lesson";

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

export type CourseLessonAttachment = InferSelectModel<typeof courseLessonAttachments>;
export type NewCourseLessonAttachment = InferInsertModel<typeof courseLessonAttachments>;
