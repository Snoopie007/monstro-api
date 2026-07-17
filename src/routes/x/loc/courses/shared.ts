import type { Context } from "elysia";
import { t } from "elysia";

export type XAuthContext = Context & { vendorId?: string; staffId?: string };
export type CourseAccessContext = { courseLocationAccess: { allowed: boolean } };

export const CourseStatusSchema = t.Union([t.Literal("draft"), t.Literal("published"), t.Literal("archived")]);
export const LessonStatusSchema = t.Union([t.Literal("draft"), t.Literal("published"), t.Literal("archived")]);

export function duplicateId(ids: string[]) {
	const seen = new Set<string>();
	for (const id of ids) {
		if (seen.has(id)) return id;
		seen.add(id);
	}
	return null;
}

export function isCourseSlugConflict(error: unknown) {
	return error !== null
		&& typeof error === "object"
		&& "code" in error
		&& error.code === "23505"
		&& "constraint" in error
		&& error.constraint === "courses_location_slug_unique";
}
