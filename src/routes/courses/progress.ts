import { db } from "@/db/db";
import { courseChapters, courseLessonCompletions, courseLessons, courses } from "@subtrees/schemas";
import { and, asc, eq, inArray } from "drizzle-orm";
import { Elysia } from "elysia";
import { deriveCourseProgressStatus, findOwnedEnrollment } from "./shared";

export const memberCourseProgressRoutes = new Elysia()
	.post("/:courseId/lessons/:lessonId/complete", async (ctx) => {
		const { params, status, memberId } = ctx as typeof ctx & { memberId: string; params: { lid: string; courseId: string; lessonId: string } };

		return db.transaction(async (tx) => {
			// Confirm the authenticated member is enrolled in this course.
			const enrollment = await findOwnedEnrollment(tx, params.lid, params.courseId, memberId);
			if (!enrollment) return status(404, { error: "Course enrollment not found" });

			// Confirm the requested lesson belongs to the published course.
			const rows = await tx.select({ lessonId: courseLessons.id })
				.from(courseLessons)
				.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
				.innerJoin(courses, eq(courseChapters.courseId, courses.id))
				.where(and(
					eq(courseLessons.id, params.lessonId),
					eq(courseLessons.status, "published"),
					eq(courseChapters.courseId, params.courseId),
					eq(courses.locationId, params.lid),
					eq(courses.status, "published"),
				))
				.limit(1);
			if (!rows[0]) return status(404, { error: "Lesson not found" });

			// Create the completion once, preserving an existing completion timestamp.
			const [created] = await tx.insert(courseLessonCompletions).values({
				enrollmentId: enrollment.id,
				lessonId: params.lessonId,
			}).onConflictDoNothing().returning({
				enrollmentId: courseLessonCompletions.enrollmentId,
				lessonId: courseLessonCompletions.lessonId,
				completedAt: courseLessonCompletions.completedAt,
			});
			if (created) return status(200, { completion: created });

			const completion = await tx.query.courseLessonCompletions.findFirst({
				where: and(
					eq(courseLessonCompletions.enrollmentId, enrollment.id),
					eq(courseLessonCompletions.lessonId, params.lessonId),
				),
				columns: { enrollmentId: true, lessonId: true, completedAt: true },
			});
			if (!completion) throw new Error("Course lesson completion was not found after conflict");
			return status(200, { completion });
		});
	})
	.get("/:courseId/progress", async (ctx) => {
		const { params, status, memberId } = ctx as typeof ctx & { memberId: string; params: { lid: string; courseId: string } };

		// Confirm the authenticated member is enrolled in this course.
		const enrollment = await findOwnedEnrollment(db, params.lid, params.courseId, memberId);
		if (!enrollment) return status(404, { error: "Course enrollment not found" });

		// Confirm the course is currently available to members.
		const course = await db.query.courses.findFirst({
			where: and(
				eq(courses.id, params.courseId),
				eq(courses.locationId, params.lid),
				eq(courses.status, "published"),
			),
			columns: { id: true },
		});
		if (!course) return status(404, { error: "Course not found" });

		// Load the published curriculum and its matching completed lessons.
		const publishedLessons = await db.select({ id: courseLessons.id })
			.from(courseLessons)
			.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
			.innerJoin(courses, eq(courseChapters.courseId, courses.id))
			.where(and(
				eq(courseChapters.courseId, params.courseId),
				eq(courseLessons.status, "published"),
				eq(courses.locationId, params.lid),
				eq(courses.status, "published"),
			))
			.orderBy(asc(courseChapters.sortOrder), asc(courseLessons.sortOrder));
		const publishedLessonIds = publishedLessons.map((lesson) => lesson.id);
		const completions = publishedLessonIds.length === 0 ? [] : await db.query.courseLessonCompletions.findMany({
			where: and(
				eq(courseLessonCompletions.enrollmentId, enrollment.id),
				inArray(courseLessonCompletions.lessonId, publishedLessonIds),
			),
			columns: { lessonId: true },
		});
		const completedLessonIdSet = new Set(completions.map((completion) => completion.lessonId));
		const completedLessonIds = publishedLessonIds.filter((lessonId) => completedLessonIdSet.has(lessonId));
		const completedCount = completedLessonIds.length;
		const totalCount = publishedLessonIds.length;

		return status(200, {
			completedLessonIds,
			completedCount,
			totalCount,
			percentage: totalCount === 0 ? 0 : Math.floor((completedCount / totalCount) * 100),
			status: deriveCourseProgressStatus(completedCount, totalCount),
		});
	});
