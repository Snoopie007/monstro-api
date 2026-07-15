import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { slugify, canAccessLocation } from "@/utils/merchandise";
import { courseLessons, courses, courseChapters, type CourseStatus, type LessonStatus } from "@subtrees/schemas";
import { and, asc, count, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { Elysia, t, type Context } from "elysia";
import { courseEnrollmentResponse } from "./enrollments";
import { coursePricingFields } from "./pricing";

type XAuthContext = Context & { vendorId?: string; staffId?: string };
type CourseAccessContext = { courseLocationAccess: { allowed: boolean } };

const CourseStatusSchema = t.Union([t.Literal("draft"), t.Literal("published"), t.Literal("archived")]);
const LessonStatusSchema = t.Union([t.Literal("draft"), t.Literal("published"), t.Literal("archived")]);
const MAX_VIDEO_SIZE = 100 * 1024 * 1024;


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

function duplicateId(ids: string[]) {
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) return id;
		seen.add(id);
	}
	return null;
}



async function saveCourseDraft(lid: string, courseId: string, body: {
	title: string;
	slug: string;
	description: string | null;
	coverImage: string | null;
	status: CourseStatus;
	paid?: boolean;
	price?: number;
	chapters: CourseDraftChapter[];
}) {
	return db.transaction(async (tx) => {
		await tx.execute(sql`select id from courses where id = ${courseId} and location_id = ${lid} for update`);
		const course = await tx.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true, status: true, paid: true, price: true } });
		if (!course) return { status: "course-missing" as const };
		const pricing = coursePricingFields(body, course);
		if ("error" in pricing) return { status: "pricing-error" as const, error: pricing.error };

		const slugOwner = await tx.query.courses.findFirst({
			where: and(eq(courses.locationId, lid), eq(courses.slug, body.slug), ne(courses.id, courseId)),
			columns: { id: true },
		});
		if (slugOwner) return { status: "slug-conflict" as const };

		await tx.execute(sql`select id from course_chapters where course_id = ${courseId} for update`);
		const dbChapters = await tx.query.courseChapters.findMany({
			where: eq(courseChapters.courseId, courseId),
			columns: { id: true, sortOrder: true },
		});
		const dbChapterIds = new Set(dbChapters.map((chapter) => chapter.id));
		const inputChapterIds = body.chapters.map((chapter) => chapter.id);
		const inputChapterIdSet = new Set(inputChapterIds);
		const inputLessonIds = body.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
		const inputLessonIdSet = new Set(inputLessonIds);
		const missingChapterIds = inputChapterIds.filter((id) => !dbChapterIds.has(id));
		const badChapterId = missingChapterIds.find((id) => !id.startsWith("chp_"));
		if (badChapterId) return { status: "bad-chapter-id" as const, id: badChapterId };
		if (missingChapterIds.length > 0) {
			const collidingChapters = await tx.query.courseChapters.findMany({
				where: inArray(courseChapters.id, missingChapterIds),
				columns: { id: true },
			});
			if (collidingChapters.length > 0) return { status: "bad-chapter-id" as const, id: collidingChapters[0]!.id };
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
			const collidingLessons = await tx.query.courseLessons.findMany({
				where: inArray(courseLessons.id, missingLessonIds),
				columns: { id: true },
			});
			if (collidingLessons.length > 0) return { status: "bad-lesson-id" as const, id: collidingLessons[0]!.id };
		}

		const now = new Date();
		await tx.update(courses).set({
			title: body.title,
			slug: body.slug,
			description: body.description,
			coverImage: body.coverImage,
			status: pricing.status,
			paid: pricing.paid,
			price: pricing.price,
			updated: now,
		}).where(eq(courses.id, courseId));

		const chapterTempBase = Math.max(body.chapters.length - 1, ...dbChapters.map((chapter) => chapter.sortOrder)) + 1;
		const finalLessonMax = Math.max(-1, ...body.chapters.map((chapter) => chapter.lessons.length - 1));
		const lessonTempBase = Math.max(finalLessonMax, ...activeLessons.map((lesson) => lesson.sortOrder)) + 1;
		for (const [index, chapter] of dbChapters.entries()) {
			await tx.update(courseChapters).set({ sortOrder: chapterTempBase + index }).where(eq(courseChapters.id, chapter.id));
		}
		for (const [index, lesson] of activeLessons.entries()) {
			await tx.update(courseLessons).set({ sortOrder: lessonTempBase + index }).where(eq(courseLessons.id, lesson.id));
		}

		for (const [chapterIndex, chapter] of body.chapters.entries()) {
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

export const xCourses = new Elysia({ prefix: "/courses" })
	.resolve(async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const { vendorId, staffId } = ctx as XAuthContext;
		return { courseLocationAccess: await canAccessLocation(lid, vendorId, staffId) };
	})
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
	.post("/upload", async (ctx) => {
		const { params, request, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid } = params as { lid: string };

		try {
			const formData = await request.formData();
			const file = formData.get("file");
			if (!(file instanceof File)) return status(400, { error: "No file provided" });
			if (!file.type.startsWith("image/")) return status(400, { error: "File must be an image" });
			if (file.size > 10 * 1024 * 1024) return status(400, { error: "Image must be 10 MB or smaller" });

			const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
			const uploadFile = new File([file], `${Date.now()}-${crypto.randomUUID()}.${extension}`, { type: file.type });
			const { url } = await new S3Bucket().uploadFile(uploadFile, `locs/${lid}/courses`);

			return status(201, { url });
		} catch (error) {
			console.error(error);
			return status(500, { error: "Failed to upload image" });
		}
	}, { parse: "none" })
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

		const existing = await db.query.courses.findFirst({
			where: and(eq(courses.locationId, lid), eq(courses.slug, slug)),
			columns: { id: true },
		});
		if (existing) return status(409, { error: "Course slug already exists for this location" });

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
			if (error !== null && typeof error === "object" && "code" in error && error.code === "23505") {
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
	.post("/:courseId/enrollments", async (ctx) => {
		const { params, body, status, vendorId, staffId } = ctx as typeof ctx & XAuthContext;
		const { lid, courseId } = params as { lid: string; courseId: string };
		const response = await courseEnrollmentResponse(db, lid, courseId, body, vendorId, staffId);
		return status(response.status, response.body);
	}, {
		body: t.Object({
			memberId: t.String(),
			paymentMethodId: t.Optional(t.String()),
			paymentType: t.Optional(t.Literal("card")),
			attemptId: t.Optional(t.String()),
		}),
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
		const title = body.title.trim();
		const slug = slugify(body.slug.trim());
		if (!title) return status(400, { error: "Course title is required" });
		if (!slug) return status(400, { error: "Course slug is required" });
		if (body.chapters.length === 0) return status(400, { error: "Course must include at least one chapter" });

		const chapterIds = body.chapters.map((chapter) => chapter.id);
		const chapterDuplicate = duplicateId(chapterIds);
		if (chapterDuplicate) return status(400, { error: "Duplicate chapter id", id: chapterDuplicate });
		const lessonIds = body.chapters.flatMap((chapter) => chapter.lessons.map((lesson) => lesson.id));
		const lessonDuplicate = duplicateId(lessonIds);
		if (lessonDuplicate) return status(400, { error: "Duplicate lesson id", id: lessonDuplicate });
		const blankChapter = body.chapters.find((chapter) => !chapter.title.trim());
		if (blankChapter) return status(400, { error: "Chapter title is required", id: blankChapter.id });
		const blankLesson = body.chapters.flatMap((chapter) => chapter.lessons).find((lesson) => !lesson.title.trim());
		if (blankLesson) return status(400, { error: "Lesson title is required", id: blankLesson.id });

		try {
			const result = await saveCourseDraft(lid, courseId, {
				title,
				slug,
				description: body.description,
				coverImage: body.coverImage,
				status: body.status as CourseStatus,
				paid: body.paid,
				price: body.price,
				chapters: body.chapters.map((chapter) => ({
					id: chapter.id,
					title: chapter.title.trim(),
					lessons: chapter.lessons.map((lesson) => ({ id: lesson.id, title: lesson.title.trim() })),
				})),
			});

			if (result.status === "course-missing") return status(404, { error: "Course not found" });
			if (result.status === "slug-conflict") return status(409, { error: "Course slug already exists for this location" });
			if (result.status === "bad-chapter-id") return status(400, { error: "Chapter id is not valid for this course", id: result.id });
			if (result.status === "bad-lesson-id") return status(400, { error: "Lesson id is not valid for this course", id: result.id });
			if (result.status === "chapter-not-empty") return status(409, { error: "Chapter must be empty before deletion", id: result.id });
			if (result.status === "pricing-error") return status(400, { error: result.error });

			return status(200, { course: result.course });
		} catch (error) {
			if (error !== null && typeof error === "object" && "code" in error && error.code === "23505") {
				return status(409, { error: "Course slug already exists for this location" });
			}
			throw error;
		}
	}, {
		body: t.Object({
			title: t.String(),
			slug: t.String(),
			description: t.Nullable(t.String()),
			coverImage: t.Nullable(t.String()),
			status: CourseStatusSchema,
			paid: t.Optional(t.Boolean()),
			price: t.Optional(t.Integer()),
			chapters: t.Array(t.Object({
				id: t.String(),
				title: t.String(),
				lessons: t.Array(t.Object({ id: t.String(), title: t.String() })),
			})),
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
		if (body.price !== undefined && body.price < 0) return status(400, { error: "Course price must be zero or greater" });

		const currentCourse = body.status !== undefined || body.paid !== undefined || body.price !== undefined
			? await db.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { status: true, paid: true, price: true } })
			: null;
		if ((body.status !== undefined || body.paid !== undefined || body.price !== undefined) && !currentCourse) return status(404, { error: "Course not found" });
		const pricing = coursePricingFields({ status: body.status as CourseStatus | undefined, paid: body.paid, price: body.price }, currentCourse ?? undefined);
		if ("error" in pricing) return status(400, { error: pricing.error });


		if (slug) {
			const existing = await db.query.courses.findFirst({
				where: and(eq(courses.locationId, lid), eq(courses.slug, slug), ne(courses.id, courseId)),
				columns: { id: true },
			});
			if (existing) return status(409, { error: "Course slug already exists for this location" });
		}

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
			if (error !== null && typeof error === "object" && "code" in error && error.code === "23505") {
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
	.post("/:courseId/chapters", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId } = params as { lid: string; courseId: string };
		const title = body.title.trim();
		if (!title) return status(400, { error: "Chapter title is required" });

		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`select id from courses where id = ${courseId} and location_id = ${lid} for update`);
			const course = await tx.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true } });
			if (!course) return null;
			const [lastChapter] = await tx.query.courseChapters.findMany({
				where: eq(courseChapters.courseId, courseId),
				orderBy: [desc(courseChapters.sortOrder)],
				limit: 1,
			});
			const [chapter] = await tx.insert(courseChapters).values({
				courseId,
				title,
				sortOrder: (lastChapter?.sortOrder ?? -1) + 1,
				metadata: body.metadata ?? {},
			}).returning();
			return chapter;
		});

		if (!result) return status(404, { error: "Course not found" });
		return status(201, { chapter: result });
	}, {
		body: t.Object({ title: t.String(), metadata: t.Optional(t.Record(t.String(), t.Unknown())) }),
	})
	.patch("/:courseId/chapters/:chapterId", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, chapterId } = params as { lid: string; courseId: string; chapterId: string };
		const title = body.title === undefined ? undefined : body.title.trim();
		if (title !== undefined && !title) return status(400, { error: "Chapter title is required" });

		const course = await db.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true } });
		if (!course) return status(404, { error: "Course not found" });

		const [chapter] = await db.update(courseChapters).set({
			...(title !== undefined ? { title } : {}),
			...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
			updated: new Date(),
		}).where(and(eq(courseChapters.id, chapterId), eq(courseChapters.courseId, courseId))).returning();

		if (!chapter) return status(404, { error: "Chapter not found" });
		return status(200, { chapter });
	}, {
		body: t.Object({ title: t.Optional(t.String()), metadata: t.Optional(t.Record(t.String(), t.Unknown())) }),
	})
	.delete("/:courseId/chapters/:chapterId", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, chapterId } = params as { lid: string; courseId: string; chapterId: string };

		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`select id from courses where id = ${courseId} and location_id = ${lid} for update`);
			const course = await tx.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true } });
			if (!course) return { status: "course-missing" as const };
			await tx.execute(sql`select id from course_chapters where id = ${chapterId} and course_id = ${courseId} for update`);
			const chapter = await tx.query.courseChapters.findFirst({ where: and(eq(courseChapters.id, chapterId), eq(courseChapters.courseId, courseId)), columns: { id: true } });
			if (!chapter) return { status: "chapter-missing" as const };
			const lesson = await tx.query.courseLessons.findFirst({ where: eq(courseLessons.chapterId, chapterId), columns: { id: true } });
			if (lesson) return { status: "not-empty" as const };
			const [chapterTotal] = await tx.select({ count: count() }).from(courseChapters).where(eq(courseChapters.courseId, courseId));
			if ((chapterTotal?.count ?? 0) <= 1) return { status: "last-chapter" as const };
			await tx.delete(courseChapters).where(eq(courseChapters.id, chapterId));
			return { status: "deleted" as const };
		});

		if (result.status === "course-missing") return status(404, { error: "Course not found" });
		if (result.status === "chapter-missing") return status(404, { error: "Chapter not found" });
		if (result.status === "not-empty") return status(409, { error: "Chapter must be empty before deletion" });
		if (result.status === "last-chapter") return status(409, { error: "Course must keep at least one chapter" });
		return status(200, { success: true });
	})
	.post("/:courseId/lessons/:lessonId/video/presigned", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };
		if (body.file.type !== "video/mp4") return status(400, { error: "Video must be an MP4" });
		if (body.file.size <= 0 || body.file.size > MAX_VIDEO_SIZE) return status(400, { error: "Video must be 100 MB or smaller" });

		const rows = await db.select({ id: courseLessons.id })
			.from(courseLessons)
			.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
			.innerJoin(courses, eq(courseChapters.courseId, courses.id))
			.where(and(eq(courseLessons.id, lessonId), eq(courseChapters.courseId, courseId), eq(courses.locationId, lid)))
			.limit(1);
		if (!rows[0]) return status(404, { error: "Lesson not found" });

		const result = await new S3Bucket().getPresignedUploadUrl(
			`locs/${lid}/courses/${courseId}/lessons/${lessonId}`,
			`${crypto.randomUUID()}.mp4`,
			body.file.type,
		);
		return status(200, result);
	}, {
		body: t.Object({
			file: t.Object({
				name: t.String(),
				type: t.String(),
				size: t.Number(),
			}),
		}),
	})
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
	.post("/:courseId/chapters/:chapterId/lessons", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, chapterId } = params as { lid: string; courseId: string; chapterId: string };
		const title = body.title.trim();
		if (!title) return status(400, { error: "Lesson title is required" });

		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`select c.id from courses c inner join course_chapters ch on ch.course_id = c.id where c.id = ${courseId} and c.location_id = ${lid} and ch.id = ${chapterId} for update of ch`);
			const chapter = await tx.select({ id: courseChapters.id })
				.from(courseChapters)
				.innerJoin(courses, eq(courseChapters.courseId, courses.id))
				.where(and(eq(courseChapters.id, chapterId), eq(courseChapters.courseId, courseId), eq(courses.locationId, lid)))
				.limit(1);
			if (!chapter[0]) return null;

			const [lastLesson] = await tx.query.courseLessons.findMany({
				where: and(eq(courseLessons.chapterId, chapterId), ne(courseLessons.status, "archived")),
				orderBy: [desc(courseLessons.sortOrder)],
				limit: 1,
			});
			const [lesson] = await tx.insert(courseLessons).values({
				chapterId,
				title,
				summary: body.summary ?? null,
				mdx: body.mdx ?? "",
				videoUrl: body.videoUrl ?? null,
				videoDurationSeconds: body.videoDurationSeconds ?? null,
				sortOrder: (lastLesson?.sortOrder ?? -1) + 1,
				status: (body.status ?? "draft") as LessonStatus,
				requiresEnrollment: body.requiresEnrollment ?? true,
				metadata: body.metadata ?? {},
			}).returning();
			return lesson;
		});

		if (!result) return status(404, { error: "Chapter not found" });
		return status(201, { lesson: result });
	}, {
		body: t.Object({
			title: t.String(),
			summary: t.Optional(t.Nullable(t.String())),
			mdx: t.Optional(t.String()),
			videoUrl: t.Optional(t.Nullable(t.String())),
			videoDurationSeconds: t.Optional(t.Nullable(t.Integer({ minimum: 0 }))),
			status: t.Optional(LessonStatusSchema),
			requiresEnrollment: t.Optional(t.Boolean()),
			metadata: t.Optional(t.Record(t.String(), t.Unknown())),
		}),
	})
	.patch("/:courseId/lessons/:lessonId", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };
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

			const [lesson] = await tx.update(courseLessons).set({
				...(title !== undefined ? { title } : {}),
				...(body.summary !== undefined ? { summary: body.summary } : {}),
				...(body.mdx !== undefined ? { mdx: body.mdx } : {}),
				...(body.videoUrl !== undefined ? { videoUrl: body.videoUrl } : {}),
				...(body.videoDurationSeconds !== undefined
					? { videoDurationSeconds: body.videoDurationSeconds }
					: body.videoUrl !== undefined
						? { videoDurationSeconds: null }
						: {}),
				...(body.status !== undefined ? { status: body.status as LessonStatus } : {}),
				...(body.requiresEnrollment !== undefined ? { requiresEnrollment: body.requiresEnrollment } : {}),
				...(body.metadata !== undefined ? { metadata: body.metadata } : {}),
				updated: new Date(),
			}).where(and(eq(courseLessons.id, lessonId), ne(courseLessons.status, "archived"))).returning();
			if (!lesson) return { status: "archived" as const };
			return { status: "updated" as const, lesson };
		});

		if (result.status === "lesson-missing") return status(404, { error: "Lesson not found" });
		if (result.status === "archived") return status(409, { error: "Archived lessons cannot be updated" });
		return status(200, { lesson: result.lesson });
	}, {
		body: t.Object({
			title: t.Optional(t.String()),
			summary: t.Optional(t.Nullable(t.String())),
			mdx: t.Optional(t.String()),
			videoUrl: t.Optional(t.Nullable(t.String())),
			videoDurationSeconds: t.Optional(t.Nullable(t.Integer({ minimum: 0 }))),
			status: t.Optional(LessonStatusSchema),
			requiresEnrollment: t.Optional(t.Boolean()),
			metadata: t.Optional(t.Record(t.String(), t.Unknown())),
		}),
	})
	.delete("/:courseId/lessons/:lessonId", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };

		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`select id from courses where id = ${courseId} and location_id = ${lid} for update`);
			const course = await tx.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true } });
			if (!course) return null;

			const rows = await tx.select({ id: courseLessons.id })
				.from(courseLessons)
				.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
				.where(and(eq(courseLessons.id, lessonId), eq(courseChapters.courseId, courseId)))
				.limit(1);
			if (!rows[0]) return null;

			const [lesson] = await tx.update(courseLessons).set({ status: "archived", updated: new Date() })
				.where(eq(courseLessons.id, lessonId)).returning();
			return lesson;
		});
		if (!result) return status(404, { error: "Lesson not found" });
		return status(200, { lesson: result });
	})
	.patch("/:courseId/structure", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId } = params as { lid: string; courseId: string };
		if (body.chapters.length === 0) return status(400, { error: "Structure must include at least one chapter" });
		const inputChapterIds = body.chapters.map((chapter) => chapter.id);

		const inputChapterIdSet = new Set(inputChapterIds);
		if (inputChapterIdSet.size !== inputChapterIds.length) return status(400, { error: "Duplicate chapter id in structure" });
		const inputLessonIds = body.chapters.flatMap((chapter) => chapter.lessonIds);
		const inputLessonIdSet = new Set(inputLessonIds);
		if (inputLessonIdSet.size !== inputLessonIds.length) return status(400, { error: "Duplicate lesson id in structure" });

		const result = await db.transaction(async (tx) => {
			await tx.execute(sql`select id from courses where id = ${courseId} and location_id = ${lid} for update`);
			const course = await tx.query.courses.findFirst({ where: and(eq(courses.id, courseId), eq(courses.locationId, lid)), columns: { id: true } });
			if (!course) return { status: "course-missing" as const };
			await tx.execute(sql`select id from course_chapters where course_id = ${courseId} for update`);

			const dbChapters = await tx.query.courseChapters.findMany({ where: eq(courseChapters.courseId, courseId), columns: { id: true } });
			if (dbChapters.length !== inputChapterIds.length || dbChapters.some((chapter) => !inputChapterIdSet.has(chapter.id))) {
				return { status: "chapter-mismatch" as const };
			}

			const dbLessons = await tx.query.courseLessons.findMany({
				where: and(inArray(courseLessons.chapterId, dbChapters.map((chapter) => chapter.id)), ne(courseLessons.status, "archived")),
				columns: { id: true },
			});
			if (dbLessons.length !== inputLessonIds.length || dbLessons.some((lesson) => !inputLessonIdSet.has(lesson.id))) {
				return { status: "lesson-mismatch" as const };
			}

			for (const [index, chapter] of dbChapters.entries()) {
				await tx.update(courseChapters).set({ sortOrder: 1000000 + index }).where(eq(courseChapters.id, chapter.id));
			}
			for (const [index, lesson] of dbLessons.entries()) {
				await tx.update(courseLessons).set({ sortOrder: 1000000 + index }).where(eq(courseLessons.id, lesson.id));
			}
			for (const [chapterIndex, chapter] of body.chapters.entries()) {
				await tx.update(courseChapters).set({ sortOrder: chapterIndex, updated: new Date() }).where(eq(courseChapters.id, chapter.id));
				for (const [lessonIndex, lessonId] of chapter.lessonIds.entries()) {
					await tx.update(courseLessons).set({ chapterId: chapter.id, sortOrder: lessonIndex, updated: new Date() }).where(eq(courseLessons.id, lessonId));
				}
			}
			return { status: "updated" as const };
		});

		if (result.status === "course-missing") return status(404, { error: "Course not found" });
		if (result.status === "chapter-mismatch") return status(400, { error: "Structure must include every chapter exactly once" });
		if (result.status === "lesson-mismatch") return status(400, { error: "Structure must include every active lesson exactly once" });
		return status(200, { course: await courseDetail(courseId, lid) });
	}, {
		body: t.Object({
			chapters: t.Array(t.Object({ id: t.String(), lessonIds: t.Array(t.String()) })),
		}),
	});
