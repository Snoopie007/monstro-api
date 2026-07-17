export const MAX_COURSE_LESSON_ATTACHMENT_SIZE = 25 * 1024 * 1024;

export const COURSE_LESSON_ATTACHMENT_CONTENT_TYPES = {
	pdf: "application/pdf",
	docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
	xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
	csv: "text/csv",
	pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
} as const;

export type CourseLessonAttachmentExtension = keyof typeof COURSE_LESSON_ATTACHMENT_CONTENT_TYPES;

const UUID_FILENAME = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function courseLessonAttachmentObjectKeyPrefix(lid: string, courseId: string, lessonId: string) {
	return `locs/${lid}/courses/${courseId}/lessons/${lessonId}/attachments/`;
}

export function getCourseLessonAttachmentExtension(fileName: string): CourseLessonAttachmentExtension | null {
	if (!fileName.trim() || fileName.length > 255 || fileName.includes("/") || fileName.includes("\\")) return null;
	const separator = fileName.lastIndexOf(".");
	if (separator < 1 || separator === fileName.length - 1) return null;
	const extension = fileName.slice(separator + 1).toLowerCase() as CourseLessonAttachmentExtension;
	return extension in COURSE_LESSON_ATTACHMENT_CONTENT_TYPES ? extension : null;
}

export function isSupportedCourseLessonAttachment(fileName: string, contentType: string, size: number) {
	const extension = getCourseLessonAttachmentExtension(fileName);
	return extension !== null
		&& contentType === COURSE_LESSON_ATTACHMENT_CONTENT_TYPES[extension]
		&& Number.isInteger(size)
		&& size >= 1
		&& size <= MAX_COURSE_LESSON_ATTACHMENT_SIZE;
}

export function isCourseLessonAttachmentObjectKey(objectKey: string, lid: string, courseId: string, lessonId: string) {
	const prefix = courseLessonAttachmentObjectKeyPrefix(lid, courseId, lessonId);
	if (!objectKey.startsWith(prefix)) return false;
	const suffix = objectKey.slice(prefix.length);
	const separator = suffix.lastIndexOf(".");
	if (separator < 1 || suffix.includes("/")) return false;
	const fileId = suffix.slice(0, separator);
	const extension = suffix.slice(separator + 1).toLowerCase() as CourseLessonAttachmentExtension;
	return suffix.slice(separator + 1) === extension
		&& UUID_FILENAME.test(fileId) && extension in COURSE_LESSON_ATTACHMENT_CONTENT_TYPES;
}

export function courseLessonAttachmentContentTypeForKey(objectKey: string, lid: string, courseId: string, lessonId: string) {
	if (!isCourseLessonAttachmentObjectKey(objectKey, lid, courseId, lessonId)) return null;
	const extension = objectKey.slice(objectKey.lastIndexOf(".") + 1).toLowerCase() as CourseLessonAttachmentExtension;
	return COURSE_LESSON_ATTACHMENT_CONTENT_TYPES[extension] ?? null;
}
