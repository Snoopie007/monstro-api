import { relations } from "drizzle-orm";
import { locations } from "../locations";
import { members } from "../members";
import { transactions } from "../transactions";
import { courseChapters } from "./chapter";
import { courseLessonCompletions } from "./completion";
import { courses } from "./course";
import { courseEnrollments } from "./enrollment";
import { courseLessons } from "./lesson";

export const coursesRelations = relations(courses, ({ many, one }) => ({
	location: one(locations, { fields: [courses.locationId], references: [locations.id] }),
	chapters: many(courseChapters),
	enrollments: many(courseEnrollments),
}));

export const courseChaptersRelations = relations(courseChapters, ({ many, one }) => ({
	course: one(courses, { fields: [courseChapters.courseId], references: [courses.id] }),
	lessons: many(courseLessons),
}));

export const courseLessonsRelations = relations(courseLessons, ({ many, one }) => ({
	chapter: one(courseChapters, { fields: [courseLessons.chapterId], references: [courseChapters.id] }),
	completions: many(courseLessonCompletions),
}));

export const courseEnrollmentsRelations = relations(courseEnrollments, ({ many, one }) => ({
	course: one(courses, { fields: [courseEnrollments.courseId], references: [courses.id] }),
	member: one(members, { fields: [courseEnrollments.memberId], references: [members.id] }),
	location: one(locations, { fields: [courseEnrollments.locationId], references: [locations.id] }),
	transaction: one(transactions, { fields: [courseEnrollments.transactionId], references: [transactions.id] }),
	completions: many(courseLessonCompletions),
}));

export const courseLessonCompletionsRelations = relations(courseLessonCompletions, ({ one }) => ({
	enrollment: one(courseEnrollments, { fields: [courseLessonCompletions.enrollmentId], references: [courseEnrollments.id] }),
	lesson: one(courseLessons, { fields: [courseLessonCompletions.lessonId], references: [courseLessons.id] }),
}));
