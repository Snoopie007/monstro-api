import { db } from "@/db/db";
import { slugify } from "@/utils/merchandise";
import { courseChapters, courseLessons, courses, type CourseStatus } from "@subtrees/schemas";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { coursePricingFields, coursePricingInputError } from "./pricing";
import { CourseStatusSchema, duplicateId, isCourseSlugConflict, type CourseAccessContext } from "./shared";

async function courseDetail(courseId: string, lid: string, reader: Pick<typeof db, "query" | "select"> = db) {
	const course = await reader.query.courses.findFirst({
		where: and(eq(courses.id, courseId), eq(courses.locationId, lid)),
	});
	if (!course) return null;

	const chapters = await reader.query.courseChapters.findMany({
		where: eq(courseChapters.courseId, courseId),
		orderBy: [asc(courseChapters.sortOrder)],
	});
	const chapterIds = chapters.map((chapter) => chapter.id);
	const lessons = chapterIds.length === 0 ? [] : await reader.query.courseLessons.findMany({
		where: and(inArray(courseLessons.chapterId, chapterIds), ne(courseLessons.status, "archived")),
		orderBy: [asc(courseLessons.sortOrder)],
	});
	const archivedLessonCounts = chapterIds.length === 0 ? [] : await reader.select({
		chapterId: courseLessons.chapterId,
		lessonCount: count(courseLessons.id),
	}).from(courseLessons)
		.where(and(inArray(courseLessons.chapterId, chapterIds), eq(courseLessons.status, "archived")))
		.groupBy(courseLessons.chapterId);
	const lessonsByChapterId = new Map<string, (typeof lessons)[number][]>();
	for (const lesson of lessons) {
		const chapterLessons = lessonsByChapterId.get(lesson.chapterId);
		if (chapterLessons) chapterLessons.push(lesson);
		else lessonsByChapterId.set(lesson.chapterId, [lesson]);
	}
	const archivedLessonCountByChapterId = new Map(archivedLessonCounts.map((row) => [row.chapterId, row.lessonCount]));

	return {
		...course,
		chapters: chapters.map((chapter) => ({
			...chapter,
			hasArchivedLessons: (archivedLessonCountByChapterId.get(chapter.id) ?? 0) > 0,
			lessons: lessonsByChapterId.get(chapter.id) ?? [],
		})),
	};
}

type CourseDraftChapter = { id: string; title: string; lessons: { id: string; title: string }[] };

async function saveCourseStructure(lid: string, courseId: string, chapters: CourseDraftChapter[]) {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select id from courses where id = ${courseId} and location_id = ${lid} for update`);
		const course = await tx.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true } });
		if (!course) return { status: "course-missing" as const };

		await tx.execute(sql`select id from course_chapters where course_id = ${courseId} for update`);
		const dbChapters = await tx.query.courseChapters.findMany({
			where: eq(courseChapters.courseId, courseId),
			columns: { id: true, sortOrder: true },
		});
		const dbChapterIds = new Set(dbChapters.map((chapter) => chapter.id));
		const inputChapterIds = chapters.map((chapter) => chapter.id);
		const inputChapterIdSet = new Set(inputChapterIds);
		const inputLessonIds = chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
		const inputLessonIdSet = new Set(inputLessonIds);
		const missingChapterIds = inputChapterIds.filter((id) => !dbChapterIds.has(id));
		const badChapterId = missingChapterIds.find((id) => !id.startsWith("chp_"));
		if (badChapterId) return { status: "bad-chapter-id" as const, id: badChapterId };
		if (missingChapterIds.length > 0) {
			const [collidingChapter] = await tx.query.courseChapters.findMany({
				where: inArray(courseChapters.id, missingChapterIds),
				columns: { id: true },
			});
			if (collidingChapter) return { status: "bad-chapter-id" as const, id: collidingChapter.id };
		}

		const omittedChapterIds = dbChapters.map((chapter) => chapter.id).filter((id) => !inputChapterIdSet.has(id));
		if (omittedChapterIds.length > 0) {
			const omittedChapterLessons = await tx.query.courseLessons.findMany({
				where: inArray(courseLessons.chapterId, omittedChapterIds),
				columns: { id: true, chapterId: true, status: true },
			});
			const blockingLesson = omittedChapterLessons.find((lesson) => lesson.status === "archived" || !inputLessonIdSet.has(lesson.id));
			if (blockingLesson) return { status: "chapter-not-empty" as const, id: blockingLesson.chapterId };
		}

		if (dbChapters.length > 0) {
			await tx.execute(sql`
				select l.id
				from course_lessons l
				inner join course_chapters ch on ch.id = l.chapter_id
				where ch.course_id = ${courseId} and l.status <> 'archived'
				for update of l
			`);
		}
		const activeLessons = dbChapters.length === 0 ? [] : await tx.query.courseLessons.findMany({
			where: and(inArray(courseLessons.chapterId, dbChapters.map((chapter) => chapter.id)), ne(courseLessons.status, "archived")),
			columns: { id: true, chapterId: true, sortOrder: true },
		});
		const activeLessonIds = new Set(activeLessons.map((lesson) => lesson.id));
		const missingLessonIds = inputLessonIds.filter((id) => !activeLessonIds.has(id));
		const badLessonId = missingLessonIds.find((id) => !id.startsWith("les_"));
		if (badLessonId) return { status: "bad-lesson-id" as const, id: badLessonId };
		if (missingLessonIds.length > 0) {
			const [collidingLesson] = await tx.query.courseLessons.findMany({
				where: inArray(courseLessons.id, missingLessonIds),
				columns: { id: true },
			});
			if (collidingLesson) return { status: "bad-lesson-id" as const, id: collidingLesson.id };
		}

		const now = new Date();

		const chapterTempBase = Math.max(chapters.length - 1, ...dbChapters.map((chapter) => chapter.sortOrder)) + 1;
		const finalLessonMax = Math.max(-1, ...chapters.map((chapter) => chapter.lessons.length - 1));
		const lessonTempBase = Math.max(finalLessonMax, ...activeLessons.map((lesson) => lesson.sortOrder)) + 1;
		for (const [index, chapter] of dbChapters.entries()) {
			await tx.update(courseChapters).set({ sortOrder: chapterTempBase + index }).where(eq(courseChapters.id, chapter.id));
		}
		for (const [index, lesson] of activeLessons.entries()) {
			await tx.update(courseLessons).set({ sortOrder: lessonTempBase + index }).where(eq(courseLessons.id, lesson.id));
		}

		for (const [chapterIndex, chapter] of chapters.entries()) {
			if (dbChapterIds.has(chapter.id)) {
				await tx.update(courseChapters).set({ title: chapter.title, sortOrder: chapterIndex, updated: now }).where(eq(courseChapters.id, chapter.id));
			} else {
				await tx.insert(courseChapters).values({ id: chapter.id, courseId, title: chapter.title, sortOrder: chapterIndex });
			}

			for (const [lessonIndex, lesson] of chapter.lessons.entries()) {
				if (activeLessonIds.has(lesson.id)) {
					await tx.update(courseLessons).set({ chapterId: chapter.id, title: lesson.title, sortOrder: lessonIndex, updated: now }).where(eq(courseLessons.id, lesson.id));
				} else {
					await tx.insert(courseLessons).values({ id: lesson.id, chapterId: chapter.id, title: lesson.title, mdx: "", sortOrder: lessonIndex, status: "draft" });
				}
			}
		}

		const omittedLessonIds = activeLessons.map((lesson) => lesson.id).filter((id) => !inputLessonIdSet.has(id));
		for (const lessonId of omittedLessonIds) {
			await tx.update(courseLessons).set({ status: "archived", updated: now }).where(eq(courseLessons.id, lessonId));
		}
		for (const chapterId of omittedChapterIds) {
			await tx.delete(courseChapters).where(eq(courseChapters.id, chapterId));
		}

		return { status: "updated" as const, course: await courseDetail(courseId, lid, tx) };
	});
}

export const courseRoutes = new Elysia()
	.get("/", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid } = params as { lid: string };

		const courseList = await db.query.courses.findMany({
			where: and(eq(courses.locationId, lid), ne(courses.status, "archived")),
			orderBy: [desc(courses.created)],
		});
		const courseIds = courseList.map((course) => course.id);
		const chapterCounts = courseIds.length === 0 ? [] : await db.select({
			courseId: courseChapters.courseId,
			chapterCount: count(courseChapters.id),
		}).from(courseChapters).where(inArray(courseChapters.courseId, courseIds)).groupBy(courseChapters.courseId);
		const lessonCounts = courseIds.length === 0 ? [] : await db.select({
			courseId: courseChapters.courseId,
			lessonCount: count(courseLessons.id),
		}).from(courseChapters)
			.innerJoin(courseLessons, eq(courseLessons.chapterId, courseChapters.id))
			.where(and(inArray(courseChapters.courseId, courseIds), ne(courseLessons.status, "archived")))
			.groupBy(courseChapters.courseId);
		const chapterCountByCourseId = new Map(chapterCounts.map((row) => [row.courseId, row.chapterCount]));
		const lessonCountByCourseId = new Map(lessonCounts.map((row) => [row.courseId, row.lessonCount]));

		return status(200, {
			courses: courseList.map((course) => ({
				...course,
				chapterCount: chapterCountByCourseId.get(course.id) ?? 0,
				lessonCount: lessonCountByCourseId.get(course.id) ?? 0,
			})),
		});
	})
	.post("/", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid } = params as { lid: string };
		const title = body.title.trim();
		if (!title) return status(400, { error: "Course title is required" });
		const slug = slugify(body.slug?.trim() || title);
		if (!slug) return status(400, { error: "Course slug is required" });

		const pricing = coursePricingFields({ status: body.status as CourseStatus | undefined, paid: body.paid, price: body.price });
		if ("error" in pricing) return status(400, { error: pricing.error });


		try {
			const course = await db.transaction(async (tx) => {
				const [createdCourse] = await tx.insert(courses).values({
					locationId: lid,
					slug,
					title,
					description: body.description ?? null,
					coverImage: body.coverImage ?? null,
					status: pricing.status,
					paid: pricing.paid,
					price: pricing.price,
					metadata: body.metadata ?? {},
				}).returning();
				if (!createdCourse) throw new Error("Course was not created");

				await tx.insert(courseChapters).values({
					courseId: createdCourse.id,
					title: "Overview",
					sortOrder: 0,
				});

				return createdCourse;
			});

			return status(201, { course });
		} catch (error) {
			if (isCourseSlugConflict(error)) {
				return status(409, { error: "Course slug already exists for this location" });
			}
			throw error;
		}
	}, {
		body: t.Object({
			slug: t.Optional(t.String()),
			title: t.String(),
			description: t.Optional(t.Nullable(t.String())),
			coverImage: t.Optional(t.Nullable(t.String())),
			status: t.Optional(CourseStatusSchema),
			paid: t.Optional(t.Boolean()),
			price: t.Optional(t.Integer()),
			metadata: t.Optional(t.Record(t.String(), t.Unknown())),
		}),
	})
	.patch("/:courseId", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId } = params as { lid: string; courseId: string };
		const title = body.title === undefined ? undefined : body.title.trim();
		if (title !== undefined && !title) return status(400, { error: "Course title is required" });
		const slug = body.slug === undefined ? undefined : slugify(body.slug.trim());
		if (slug !== undefined && !slug) return status(400, { error: "Course slug is required" });

		const pricingInput = { status: body.status as CourseStatus | undefined, paid: body.paid, price: body.price };
		const pricingInputError = coursePricingInputError(pricingInput);
		if (pricingInputError) return status(400, pricingInputError);

		const currentCourse = body.status !== undefined || body.paid !== undefined || body.price !== undefined
			? await db.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { status: true, paid: true, price: true } })
			: null;
		if ((body.status !== undefined || body.paid !== undefined || body.price !== undefined) && !currentCourse) return status(404, { error: "Course not found" });
		const pricing = coursePricingFields(pricingInput, currentCourse ?? undefined);
		if ("error" in pricing) return status(400, { error: pricing.error });


		try {
			const [course] = await db.update(courses).set({
				...(slug !== undefined ? { slug } : {}),
				...(title !== undefined ? { title } : {}),
				...(body.description !== undefined ? { description: body.description } : {}),
				...(body.coverImage !== undefined ? { coverImage: body.coverImage } : {}),
				...(body.status !== undefined || body.paid !== undefined || body.price !== undefined ? { status: pricing.status, paid: pricing.paid, price: pricing.price } : {}),
				...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
				updated: new Date(),
			}).where(and(eq(courses.id, courseId), eq(courses.locationId, lid))).returning();

			if (!course) return status(404, { error: "Course not found" });
			return status(200, { course });
		} catch (error) {
			if (isCourseSlugConflict(error)) {
				return status(409, { error: "Course slug already exists for this location" });
			}
			throw error;
		}
	}, {
		body: t.Object({
			slug: t.Optional(t.String()),
			title: t.Optional(t.String()),
			description: t.Optional(t.Nullable(t.String())),
			coverImage: t.Optional(t.Nullable(t.String())),
			status: t.Optional(CourseStatusSchema),
			paid: t.Optional(t.Boolean()),
			price: t.Optional(t.Integer()),
			metadata: t.Optional(t.Record(t.String(), t.Unknown())),
		}),
	})
	.delete("/:courseId", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId } = params as { lid: string; courseId: string };

		const [course] = await db.update(courses).set({ status: "archived", updated: new Date() })
			.where(and(eq(courses.id, courseId), eq(courses.locationId, lid))).returning();
		if (!course) return status(404, { error: "Course not found" });
		return status(200, { course });
	})
	.get("/:courseId", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId } = params as { lid: string; courseId: string };

		const course = await courseDetail(courseId, lid);
		if (!course) return status(404, { error: "Course not found" });
		return status(200, { course });
	})
	.put("/:courseId", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId } = params as { lid: string; courseId: string };
		if (body.chapters.length === 0) return status(400, { error: "Course must include at least one chapter" });

		const chapterIds = body.chapters.map((chapter) => chapter.id);
		const chapterDuplicate = duplicateId(chapterIds);
		if (chapterDuplicate !== null) return status(400, { error: "Duplicate chapter id", id: chapterDuplicate });
		const lessonIds = body.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
		const lessonDuplicate = duplicateId(lessonIds);
		if (lessonDuplicate !== null) return status(400, { error: "Duplicate lesson id", id: lessonDuplicate });
		const blankChapter = body.chapters.find((chapter) => !chapter.title.trim());
		if (blankChapter) return status(400, { error: "Chapter title is required", id: blankChapter.id });
		const blankLesson = body.chapters.flatMap((chapter) => chapter.lessons).find((lesson) => !lesson.title.trim());
		if (blankLesson) return status(400, { error: "Lesson title is required", id: blankLesson.id });

		const result = await saveCourseStructure(lid, courseId, body.chapters.map((chapter) => ({
			id: chapter.id,
			title: chapter.title.trim(),
			lessons: chapter.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title.trim() })),
		})));

		if (result.status === "course-missing") return status(404, { error: "Course not found" });
		if (result.status === "bad-chapter-id") return status(400, { error: "Chapter id is not valid for this course", id: result.id });
		if (result.status === "bad-lesson-id") return status(400, { error: "Lesson id is not valid for this course", id: result.id });
		if (result.status === "chapter-not-empty") return status(409, { error: "Chapter must be empty before deletion", id: result.id });

		return status(200, { course: result.course });
	}, {
		body: t.Object({
			chapters: t.Array(t.Object({
				id: t.String(),
				title: t.String(),
				lessons: t.Array(t.Object({ id: t.String(), title: t.String() })),
			})),
		}),
	});
