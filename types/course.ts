import type { CourseStatus, LessonStatus } from "../schemas/courses";
import { courseChapters, courseLessons, courses } from "../schemas/courses";
import type { Location } from "./location";

export type { CourseStatus, LessonStatus };

export type Course = typeof courses.$inferSelect & {
	location?: Location;
	chapters?: CourseChapter[];
	chapterCount?: number;
	lessonCount?: number;
};

export type CourseChapter = typeof courseChapters.$inferSelect & {
	course?: Course;
	lessons?: CourseLesson[];
};

export type CourseLesson = typeof courseLessons.$inferSelect & {
	chapter?: CourseChapter;
};

export type NewCourse = typeof courses.$inferInsert;
export type NewCourseChapter = typeof courseChapters.$inferInsert;
export type NewCourseLesson = typeof courseLessons.$inferInsert;
