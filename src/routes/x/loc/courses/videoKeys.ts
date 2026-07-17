export function courseLessonVideoObjectKeyPrefix(lid: string, courseId: string, lessonId: string) {
	return `locs/${lid}/courses/${courseId}/lessons/${lessonId}/`;
}

export function isCourseLessonVideoObjectKey(objectKey: string, lid: string, courseId: string, lessonId: string) {
	const prefix = courseLessonVideoObjectKeyPrefix(lid, courseId, lessonId);
	const filename = objectKey.startsWith(prefix) ? objectKey.slice(prefix.length) : "";
	return Boolean(filename)
		&& filename.endsWith(".mp4")
		&& !filename.includes("/")
		&& !filename.includes("\\")
		&& !filename.includes("://")
		&& !filename.includes("?")
		&& !filename.includes("#")
		&& !filename.includes("..");
}
