import { type InferInsertModel, type InferSelectModel } from "drizzle-orm";
import { foreignKey, index, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";
import { courseEnrollments } from "./enrollment";
import { courseLessons } from "./lesson";

export const courseLessonCompletions = pgTable("course_lesson_completions", {
	enrollmentId: text("enrollment_id").notNull(),
	lessonId: text("lesson_id").notNull(),
	completedAt: timestamp("completed_at", { withTimezone: true }).notNull().defaultNow(),
}, (t) => [
	primaryKey({ name: "course_lesson_completions_pkey", columns: [t.enrollmentId, t.lessonId] }),
	foreignKey({
		name: "course_lesson_completions_enrollment_fk",
		columns: [t.enrollmentId],
		foreignColumns: [courseEnrollments.id],
	}).onDelete("cascade"),
	foreignKey({
		name: "course_lesson_completions_lesson_fk",
		columns: [t.lessonId],
		foreignColumns: [courseLessons.id],
	}).onDelete("cascade"),
	index("course_lesson_completions_lesson_idx").on(t.lessonId),
]);

export type CourseLessonCompletion = InferSelectModel<typeof courseLessonCompletions>;
export type NewCourseLessonCompletion = InferInsertModel<typeof courseLessonCompletions>;
