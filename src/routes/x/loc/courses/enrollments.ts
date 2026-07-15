import { db } from "@/db/db";
import {
	courseEnrollmentTransaction,
	enrollMemberInCourseCore,
	type GatewayFactory,
} from "@/handlers/course/enrollment";
import {
	duplicateCourseEnrollmentMessage,
	memberCourseEnrollmentHttpError,
	MemberCourseEnrollmentError,
	validateMemberCourseEnrollmentBody,
} from "@/handlers/course/shared";
import { canAccessLocation } from "@/utils/merchandise";

export const duplicateEnrollmentMessage = duplicateCourseEnrollmentMessage;

export function isUniqueViolation(error: unknown, constraint?: string) {
	return error !== null
		&& typeof error === "object"
		&& "code" in error
		&& error.code === "23505"
		&& (constraint === undefined || ("constraint" in error && error.constraint === constraint));
}

export async function enrollMemberInCourse(database: typeof db, lid: string, courseId: string, memberId: string, vendorId?: string, staffId?: string, body: unknown = {}, gateways?: GatewayFactory) {
	const paymentBody = validateMemberCourseEnrollmentBody(body);
	return courseEnrollmentTransaction(database, async (tx) => {
		const { allowed } = await canAccessLocation(lid, vendorId, staffId, tx);
		if (!allowed) throw new MemberCourseEnrollmentError(403, "Forbidden", "FORBIDDEN");
		return enrollMemberInCourseCore({ tx, lid, courseId, memberId, body: paymentBody, gateways });
	});
}

export async function courseEnrollmentResponse(database: typeof db, lid: string, courseId: string, body: unknown, vendorId?: string, staffId?: string) {
	try {
		if (!body || typeof body !== "object" || Array.isArray(body)) throw new MemberCourseEnrollmentError(400, "Request body must be an object", "INVALID_BODY");
		const { memberId, ...paymentBody } = body as Record<string, unknown>;
		if (typeof memberId !== "string") throw new MemberCourseEnrollmentError(400, "memberId must be a string", "INVALID_BODY");
		const result = await enrollMemberInCourse(database, lid, courseId, memberId, vendorId, staffId, paymentBody);
		return { status: 201 as const, body: { id: result.id, transactionId: result.transactionId } };
	} catch (error) {
		return memberCourseEnrollmentHttpError(error);
	}
}
