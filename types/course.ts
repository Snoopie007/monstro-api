import type { courseLessonAttachments, CourseStatus, LessonStatus } from "../schemas/courses";
import {
	courseChapters,
	courseEnrollments,
	courseLessonCompletions,
	courseLessons,
	courses,
} from "../schemas/courses";
import type { Location } from "./location";
import type { Member } from "./member";
import type { Transaction } from "./transaction";

export type { CourseStatus, LessonStatus };

export type Course = typeof courses.$inferSelect & {
	location?: Location;
	chapters?: CourseChapter[];
	chapterCount?: number;
	lessonCount?: number;
	enrollments?: CourseEnrollment[];
};

export type CourseChapter = typeof courseChapters.$inferSelect & {
	course?: Course;
	lessons?: CourseLesson[];
};
export type CourseLessonAttachment = typeof courseLessonAttachments.$inferSelect & {
	lesson?: CourseLesson;
	contentUrl?: string;
};
export type CourseLesson = typeof courseLessons.$inferSelect & {
	chapter?: CourseChapter;
	completions?: CourseLessonCompletion[];
	attachments?: CourseLessonAttachment[];
	videoUrl?: string;
};



export type CourseEnrollment = typeof courseEnrollments.$inferSelect & {
	course?: Course;
	member?: Member;
	location?: Location;
	transaction?: Transaction | null;
	lessonCompletions?: CourseLessonCompletion[];
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
