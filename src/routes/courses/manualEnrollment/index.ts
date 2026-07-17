import { db } from "@/db/db";
import {
	courseEnrollmentTransaction,
	enrollMemberInCourseCore,
} from "@/handlers/courses/manualEnrollment";
import type { GatewayFactory } from "@/handlers/courses/manualEnrollment";
import {
	memberCourseEnrollmentHttpError,
	MemberCourseEnrollmentError,
	validateMemberCourseEnrollmentBody,
} from "@/handlers/courses/manualEnrollment/shared";
import { canAccessLocation } from "@/utils/merchandise";
import { Elysia, t } from "elysia";
import type { XAuthContext } from "@/routes/x/loc/courses/shared";


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
		const result = await enrollMemberInCourse(database, lid, courseId, memberId, vendorId, staffId, paymentBody) as Awaited<ReturnType<typeof enrollMemberInCourseCore>>;
		return { status: 201 as const, body: { id: result.id, transactionId: result.transactionId } };
	} catch (error) {
		return memberCourseEnrollmentHttpError(error);
	}
}

export const courseEnrollmentRoutes = new Elysia()
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
	});
