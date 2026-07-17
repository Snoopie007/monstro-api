import { db } from "@/db/db";
import { courseLessons, courses, courseChapters, type LessonStatus } from "@subtrees/schemas";
import { and, eq, ne, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { deleteCourseLessonVideoObjectBestEffort, isCourseLessonVideoObjectKey } from "./uploads";
import { LessonStatusSchema, type CourseAccessContext } from "./shared";

export const courseLessonRoutes = new Elysia()
	.get("/:courseId/lessons/:lessonId", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };

		const rows = await db.select({ lesson: courseLessons })
			.from(courseLessons)
			.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
			.innerJoin(courses, eq(courseChapters.courseId, courses.id))
			.where(and(eq(courseLessons.id, lessonId), eq(courseChapters.courseId, courseId), eq(courses.locationId, lid)))
			.limit(1);
		const lesson = rows[0]?.lesson;
		if (!lesson) return status(404, { error: "Lesson not found" });
		return status(200, { lesson });
	})

	.patch("/:courseId/lessons/:lessonId", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };
		if (body.videoObjectKey !== undefined && body.videoObjectKey !== null && !isCourseLessonVideoObjectKey(body.videoObjectKey, lid, courseId, lessonId)) return status(400, { error: "Video object key is not valid for this lesson" });
		const title = body.title === undefined ? undefined : body.title.trim();
		if (title !== undefined && !title) return status(400, { error: "Lesson title is required" });

		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`select id from courses where id = ${courseId} and location_id = ${lid} for update`);
			const course = await tx.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true } });
			if (!course) return { status: "lesson-missing" as const };

			const rows = await tx.select({ lesson: courseLessons })
				.from(courseLessons)
				.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
				.where(and(eq(courseLessons.id, lessonId), eq(courseChapters.courseId, courseId)))
				.limit(1);
			const currentLesson = rows[0]?.lesson;
			if (!currentLesson) return { status: "lesson-missing" as const };
			if (currentLesson.status === "archived") return { status: "archived" as const };

			const nextVideoObjectKey = body.videoObjectKey === undefined ? currentLesson.videoObjectKey : body.videoObjectKey;
			const videoObjectKeyChanged = body.videoObjectKey !== undefined && body.videoObjectKey !== currentLesson.videoObjectKey;
			const nextVideoDurationSeconds = nextVideoObjectKey === null
				? null
				: body.videoDurationSeconds !== undefined
					? body.videoDurationSeconds
					: videoObjectKeyChanged
						? null
						: currentLesson.videoDurationSeconds;
			const nextVideoThumbnail = nextVideoObjectKey === null
				? null
				: body.videoThumbnail !== undefined
					? body.videoThumbnail
					: currentLesson.videoThumbnail;
			const [lesson] = await tx.update(courseLessons).set({
				...(title !== undefined ? { title } : {}),
				...(body.summary !== undefined ? { summary: body.summary } : {}),
				...(body.mdx !== undefined ? { mdx: body.mdx } : {}),
				...(body.videoObjectKey !== undefined ? { videoObjectKey: nextVideoObjectKey } : {}),
				...(body.videoThumbnail !== undefined || body.videoObjectKey !== undefined ? { videoThumbnail: nextVideoThumbnail } : {}),
				...(body.videoObjectKey !== undefined || body.videoDurationSeconds !== undefined ? { videoDurationSeconds: nextVideoDurationSeconds } : {}),
				...(body.status !== undefined ? { status: body.status as LessonStatus } : {}),
				...(body.isPreview !== undefined ? { isPreview: body.isPreview } : {}),
				...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
				updated: new Date(),
			}).where(and(eq(courseLessons.id, lessonId), ne(courseLessons.status, "archived"))).returning();
			if (!lesson) return { status: "archived" as const };
			return {
				status: "updated" as const,
				lesson,
				oldVideoObjectKey: currentLesson.videoObjectKey !== nextVideoObjectKey ? currentLesson.videoObjectKey : null,
			};
		});

		if (result.status === "lesson-missing") return status(404, { error: "Lesson not found" });
		if (result.status === "updated" && result.oldVideoObjectKey) await deleteCourseLessonVideoObjectBestEffort(result.oldVideoObjectKey);
		if (result.status === "archived") return status(409, { error: "Archived lessons cannot be updated" });
		return status(200, { lesson: result.lesson });
	}, {
		body: t.Object({
			title: t.Optional(t.String()),
			summary: t.Optional(t.Nullable(t.String())),
			mdx: t.Optional(t.String()),
			videoObjectKey: t.Optional(t.Nullable(t.String())),
			videoThumbnail: t.Optional(t.Nullable(t.String())),
			videoDurationSeconds: t.Optional(t.Nullable(t.Integer({ minimum: 0 }))),
			status: t.Optional(LessonStatusSchema),
			isPreview: t.Optional(t.Boolean()),
			metadata: t.Optional(t.Record(t.String(), t.Unknown())),
		}),
	});
