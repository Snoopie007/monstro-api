import { relations } from "drizzle-orm";
import { locations } from "../locations";
import { courseChapters } from "./chapter";
import { courses } from "./course";
import { courseLessons } from "./lesson";

export const coursesRelations = relations(courses, ({ many, one }) => ({
	location: one(locations, { fields: [courses.locationId], references: [locations.id] }),
	chapters: many(courseChapters),
}));

export const courseChaptersRelations = relations(courseChapters, ({ many, one }) => ({
	course: one(courses, { fields: [courseChapters.courseId], references: [courses.id] }),
	lessons: many(courseLessons),
}));

export const courseLessonsRelations = relations(courseLessons, ({ one }) => ({
	chapter: one(courseChapters, { fields: [courseLessons.chapterId], references: [courseChapters.id] }),
}));
