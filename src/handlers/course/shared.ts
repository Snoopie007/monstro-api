import { createHash } from "node:crypto";

export type MemberCourseEnrollmentBody = {
	paymentMethodId?: string;
	paymentType?: "card";
	attemptId?: string;
};

export class MemberCourseEnrollmentError extends Error {
	constructor(readonly status: 400 | 401 | 403 | 404 | 409, message: string, readonly code?: string) {
		super(message);
		this.name = "MemberCourseEnrollmentError";
	}
}

export const duplicateCourseEnrollmentMessage = "Member is already enrolled in this course";

export function deterministicCourseEnrollmentId(lid: string, courseId: string, memberId: string) {
	return `cen_${hash(`${lid}:${courseId}:${memberId}`).slice(0, 24)}`;
}

export function deterministicCourseTransactionId(enrollmentId: string) {
	return `txn_${hash(enrollmentId).slice(0, 24)}`;
}

export function deterministicCourseEnrollmentIdempotencyKey(lid: string, courseId: string, memberId: string, attemptId: string) {
	return `course-enrollment:${hash(`${lid}:${courseId}:${memberId}:${attemptId}`).slice(0, 24)}`;
}

export function validateMemberCourseEnrollmentBody(body: unknown): MemberCourseEnrollmentBody {
	if (!body || typeof body !== "object" || Array.isArray(body)) {
		throw new MemberCourseEnrollmentError(400, "Request body must be an object", "INVALID_BODY");
	}
	const allowed: Record<string, true> = { paymentMethodId: true, paymentType: true, attemptId: true };
	for (const key of Object.keys(body)) {
		if (!allowed[key]) throw new MemberCourseEnrollmentError(400, "Only paymentMethodId, paymentType, and attemptId are allowed", "INVALID_BODY");
	}
	const value = body as Record<string, unknown>;
	if (value.paymentMethodId !== undefined && typeof value.paymentMethodId !== "string") {
		throw new MemberCourseEnrollmentError(400, "paymentMethodId must be a string", "INVALID_BODY");
	}
	if (value.paymentType !== undefined && value.paymentType !== "card") {
		throw new MemberCourseEnrollmentError(400, "paymentType must be card", "INVALID_BODY");
	}
	if (value.attemptId !== undefined && (typeof value.attemptId !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(value.attemptId))) {
		throw new MemberCourseEnrollmentError(400, "attemptId must be 1-64 letters, numbers, underscores, or hyphens", "INVALID_BODY");
	}
	return {
		...(value.paymentMethodId !== undefined ? { paymentMethodId: value.paymentMethodId } : {}),
		...(value.paymentType !== undefined ? { paymentType: value.paymentType } : {}),
		...(value.attemptId !== undefined ? { attemptId: value.attemptId as string } : {}),
	};
}

export function memberCourseEnrollmentHttpError(error: unknown) {
	if (error instanceof MemberCourseEnrollmentError) {
		return { status: error.status, body: { error: error.message, ...(error.code ? { code: error.code } : {}) } };
	}
	throw error;
}

export function isCourseEnrollmentUniqueViolation(error: unknown) {
	return error !== null
		&& typeof error === "object"
		&& "code" in error
		&& error.code === "23505"
		&& "constraint" in error
		&& error.constraint === "course_enrollments_course_member_unique";
}

export function isMissingOwnedPaymentMethod(error: unknown) {
	return error !== null
		&& typeof error === "object"
		&& "code" in error
		&& error.code === "resource_missing";
}

function hash(value: string) {
	return createHash("sha256").update(value).digest("hex");
}
