import { db } from "@/db/db";
import S3Bucket from "@/libs/s3";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import { courseChapters, courseLessonAttachments, courseLessons, courses } from "@subtrees/schemas";
import type { CourseAccessContext } from "./shared";
import {
	COURSE_LESSON_ATTACHMENT_CONTENT_TYPES,
	MAX_COURSE_LESSON_ATTACHMENT_SIZE,
	courseLessonAttachmentContentTypeForKey,
	courseLessonAttachmentObjectKeyPrefix,
	getCourseLessonAttachmentExtension,
	isCourseLessonAttachmentObjectKey,
	isSupportedCourseLessonAttachment,
} from "./attachmentKeys";

const ATTACHMENT_SIGNED_URL_TTL_SECONDS = 300;

async function lessonExists(lid: string, courseId: string, lessonId: string) {
	const rows = await db.select({ id: courseLessons.id })
		.from(courseLessons)
		.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
		.innerJoin(courses, eq(courseChapters.courseId, courses.id))
		.where(and(eq(courseLessons.id, lessonId), eq(courseChapters.courseId, courseId), eq(courses.locationId, lid)))
		.limit(1);
	return Boolean(rows[0]);
}

export async function deleteCourseLessonAttachmentBestEffort(
	objectKey: string,
	s3: Pick<S3Bucket, "removeObject"> = new S3Bucket(),
) {
	try {
		await s3.removeObject(objectKey);
	} catch (error) {
		console.error("Could not delete course lesson attachment object", error);
	}
}

export const courseLessonAttachmentRoutes = new Elysia()
	.get("/:courseId/lessons/:lessonId/attachments", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };
		if (!(await lessonExists(lid, courseId, lessonId))) return status(404, { error: "Lesson not found" });

		const rows = await db.select({
			id: courseLessonAttachments.id,
			lessonId: courseLessonAttachments.lessonId,
			fileName: courseLessonAttachments.fileName,
			contentType: courseLessonAttachments.contentType,
			sizeBytes: courseLessonAttachments.sizeBytes,
			created: courseLessonAttachments.created,
		})
			.from(courseLessonAttachments)
			.innerJoin(courseLessons, eq(courseLessonAttachments.lessonId, courseLessons.id))
			.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
			.innerJoin(courses, eq(courseChapters.courseId, courses.id))
			.where(and(eq(courseLessonAttachments.lessonId, lessonId), eq(courseChapters.courseId, courseId), eq(courses.locationId, lid)))
			.orderBy(courseLessonAttachments.created, courseLessonAttachments.id);

		return status(200, { attachments: rows });
	})
	.post("/:courseId/lessons/:lessonId/attachments/presigned", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };
		if (!(await lessonExists(lid, courseId, lessonId))) return status(404, { error: "Lesson not found" });

		const extension = getCourseLessonAttachmentExtension(body.file.name);
		if (!extension || !isSupportedCourseLessonAttachment(body.file.name, body.file.type, body.file.size)) {
			return status(400, { error: "Attachment must be a supported file of 25 MB or smaller" });
		}

		const objectKey = `${courseLessonAttachmentObjectKeyPrefix(lid, courseId, lessonId)}${crypto.randomUUID()}.${extension}`;
		const result = await new S3Bucket().getPresignedUploadUrlWithObjectKey(
			courseLessonAttachmentObjectKeyPrefix(lid, courseId, lessonId).slice(0, -1),
			objectKey.slice(objectKey.lastIndexOf("/") + 1),
			COURSE_LESSON_ATTACHMENT_CONTENT_TYPES[extension],
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
	.post("/:courseId/lessons/:lessonId/attachments", async (ctx) => {
		const { params, body, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId } = params as { lid: string; courseId: string; lessonId: string };
		if (!(await lessonExists(lid, courseId, lessonId))) return status(404, { error: "Lesson not found" });

		const expectedContentType = courseLessonAttachmentContentTypeForKey(body.objectKey, lid, courseId, lessonId);
		const extension = getCourseLessonAttachmentExtension(body.fileName);
		if (!expectedContentType || !extension || COURSE_LESSON_ATTACHMENT_CONTENT_TYPES[extension] !== expectedContentType) {
			return status(400, { error: "Attachment metadata is not valid for this lesson" });
		}
		if (body.contentType !== undefined && body.contentType !== expectedContentType) {
			return status(400, { error: "Attachment content type is not valid" });
		}

		const head = await new S3Bucket().headObject(body.objectKey).catch(() => null);
		if (!head) return status(400, { error: "Uploaded attachment could not be verified" });
		const sizeBytes = head.ContentLength;
		if (typeof sizeBytes !== "number" || !Number.isInteger(sizeBytes) || sizeBytes < 1 || sizeBytes > MAX_COURSE_LESSON_ATTACHMENT_SIZE || head.ContentType !== expectedContentType) {
			return status(400, { error: "Uploaded attachment metadata does not match" });
		}

		try {
			const [attachment] = await db.insert(courseLessonAttachments).values({
				lessonId,
				objectKey: body.objectKey,
				fileName: body.fileName,
				contentType: expectedContentType,
				sizeBytes,
			}).returning({
				id: courseLessonAttachments.id,
				lessonId: courseLessonAttachments.lessonId,
				fileName: courseLessonAttachments.fileName,
				contentType: courseLessonAttachments.contentType,
				sizeBytes: courseLessonAttachments.sizeBytes,
				created: courseLessonAttachments.created,
			});
			if (!attachment) return status(500, { error: "Could not save attachment" });
			return status(201, { attachment });
		} catch (error) {
			if (error !== null && typeof error === "object" && "code" in error && error.code === "23505" && "constraint" in error && error.constraint === "course_lesson_attachments_object_key_unique") {
				return status(409, { error: "Attachment already exists" });
			}
			throw error;
		}
	}, {
		body: t.Object({
			objectKey: t.String(),
			fileName: t.String(),
			contentType: t.Optional(t.String()),
		}),
	})
	.get("/:courseId/lessons/:lessonId/attachments/:attachmentId/url", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId, attachmentId } = params as { lid: string; courseId: string; lessonId: string; attachmentId: string };
		const rows = await db.select({
			objectKey: courseLessonAttachments.objectKey,
			fileName: courseLessonAttachments.fileName,
		})
			.from(courseLessonAttachments)
			.innerJoin(courseLessons, eq(courseLessonAttachments.lessonId, courseLessons.id))
			.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
			.innerJoin(courses, eq(courseChapters.courseId, courses.id))
			.where(and(eq(courseLessonAttachments.id, attachmentId), eq(courseLessonAttachments.lessonId, lessonId), eq(courseChapters.courseId, courseId), eq(courses.locationId, lid)))
			.limit(1);
		const attachment = rows[0];
		if (!attachment || !isCourseLessonAttachmentObjectKey(attachment.objectKey, lid, courseId, lessonId)) return status(404, { error: "Attachment not found" });

		try {
			const url = await new S3Bucket().getSignedUrl(attachment.objectKey, ATTACHMENT_SIGNED_URL_TTL_SECONDS, false, attachment.fileName);
			return status(200, { url });
		} catch {
			return status(500, { error: "Could not sign attachment URL" });
		}
	})
	.delete("/:courseId/lessons/:lessonId/attachments/:attachmentId", async (ctx) => {
		const { params, status, courseLocationAccess } = ctx as typeof ctx & CourseAccessContext;
		if (!courseLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
		const { lid, courseId, lessonId, attachmentId } = params as { lid: string; courseId: string; lessonId: string; attachmentId: string };
		const rows = await db.select({
			id: courseLessonAttachments.id,
			objectKey: courseLessonAttachments.objectKey,
		})
			.from(courseLessonAttachments)
			.innerJoin(courseLessons, eq(courseLessonAttachments.lessonId, courseLessons.id))
			.innerJoin(courseChapters, eq(courseLessons.chapterId, courseChapters.id))
			.innerJoin(courses, eq(courseChapters.courseId, courses.id))
			.where(and(
				eq(courseLessonAttachments.id, attachmentId),
				eq(courseLessonAttachments.lessonId, lessonId),
				eq(courseChapters.courseId, courseId),
				eq(courses.locationId, lid),
			))
			.limit(1);
		const attachment = rows[0];
		if (!attachment) return status(404, { error: "Attachment not found" });
		if (!isCourseLessonAttachmentObjectKey(attachment.objectKey, lid, courseId, lessonId)) return status(404, { error: "Attachment not found" });

		const [deleted] = await db.delete(courseLessonAttachments)
			.where(eq(courseLessonAttachments.id, attachment.id))
			.returning({ objectKey: courseLessonAttachments.objectKey });
		if (!deleted) return status(404, { error: "Attachment not found" });
		await deleteCourseLessonAttachmentBestEffort(deleted.objectKey);
		return status(200, { deleted: true });
	});
