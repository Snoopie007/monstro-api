import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { courseChapters, courseLessons, courses } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import type { CourseAccessContext } from "./shared";
import { courseLessonVideoObjectKeyPrefix, isCourseLessonVideoObjectKey } from "./videoKeys";
export { courseLessonVideoObjectKeyPrefix, isCourseLessonVideoObjectKey } from "./videoKeys";

const MAX_VIDEO_SIZE = 100 * 1024 * 1024;
const VIDEO_SIGNED_URL_TTL_SECONDS = 3600;


export async function deleteCourseLessonVideoObjectBestEffort(objectKey: string, s3: Pick<S3Bucket, "removeObject"> = new S3Bucket()) {
	try {
		await s3.removeObject(objectKey);
	} catch (error) {
		console.error("Could not delete replaced course lesson video", error);
	}
}

export const courseUploadRoutes = new Elysia()
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

		const fileName = `${crypto.randomUUID()}.mp4`;
		const result = await new S3Bucket().getPresignedUploadUrlWithObjectKey(
			courseLessonVideoObjectKeyPrefix(lid, courseId, lessonId).slice(0, -1),
			fileName,
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
	.get("/:courseId/lessons/:lessonId/video-url", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };
		const rows = await db.select({ videoObjectKey: courseLessons.videoObjectKey })
			.from(courseLessons)
			.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
			.innerJoin(courses, eq(courseChapters.courseId, courses.id))
			.where(and(eq(courseLessons.id, lessonId), eq(courseChapters.courseId, courseId), eq(courses.locationId, lid)))
			.limit(1);
		const objectKey = rows[0]?.videoObjectKey;
		if (!objectKey || !isCourseLessonVideoObjectKey(objectKey, lid, courseId, lessonId)) return status(404, { error: "Video not found" });

		const url = await new S3Bucket().getSignedUrl(objectKey, VIDEO_SIGNED_URL_TTL_SECONDS, false);
		return status(200, { url });
	});
