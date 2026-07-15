import { courseChapters, courseEnrollments, courseLessonCompletions, courseLessons, courses } from "../schemas/courses";
import type { CourseStatus, LessonStatus } from "../schemas/courses";
import type { Location } from "./location";
import type { Member } from "./member";
import type { Transaction } from "./transaction";

export type { CourseStatus, LessonStatus };

export type Course = typeof courses.$inferSelect & {
	location?: Location;
	chapters?: CourseChapter[];
	enrollments?: CourseEnrollment[];
};

export type CourseChapter = typeof courseChapters.$inferSelect & {
	course?: Course;
	lessons?: CourseLesson[];
};

export type CourseLesson = typeof courseLessons.$inferSelect & {
	chapter?: CourseChapter;
	completions?: CourseLessonCompletion[];
};

export type CourseEnrollment = typeof courseEnrollments.$inferSelect & {
	course?: Course;
	member?: Member;
	location?: Location;
	transaction?: Transaction;
	completions?: CourseLessonCompletion[];
};

export type CourseLessonCompletion = typeof courseLessonCompletions.$inferSelect & {
	enrollment?: CourseEnrollment;
	lesson?: CourseLesson;
};

export type NewCourse = typeof courses.$inferInsert;
export type NewCourseChapter = typeof courseChapters.$inferInsert;
export type NewCourseLesson = typeof courseLessons.$inferInsert;
export type NewCourseEnrollment = typeof courseEnrollments.$inferInsert;
export type NewCourseLessonCompletion = typeof courseLessonCompletions.$inferInsert;
