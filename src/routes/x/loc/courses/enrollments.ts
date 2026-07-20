import { db } from "@/db/db";
import { CourseEnrollError, handleCourseEnrollFree, handleCourseEnrollPaid, mapCourseEnrollPaidError } from "@/handlers/course";
import { canAccessLocation } from "@/utils/merchandise";
import { courseEnrollments, courses, memberLocations } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";
import type { XAuthContext } from "./shared";

export const courseEnrollmentRoutes = new Elysia()
    .post("/:courseId/enrollments", async (ctx) => {
        const { params, body, status, vendorId, staffId } = ctx as typeof ctx & XAuthContext;
        const { lid, courseId } = params as { lid: string; courseId: string };
        const { memberId, paymentMethodId, paymentType } = body;

        try {
            const { allowed } = await canAccessLocation(lid, vendorId, staffId);
            if (!allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

            const course = await db.query.courses.findFirst({
                where: and(eq(courses.id, courseId), eq(courses.locationId, lid)),
                columns: { id: true, title: true, price: true, status: true },
            });
            if (!course) throw new CourseEnrollError(404, "Course not found");
            if (course.status !== "published") throw new CourseEnrollError(400, "Course must be published to enroll");

            const memberLocation = await db.query.memberLocations.findFirst({
                where: and(eq(memberLocations.memberId, memberId), eq(memberLocations.locationId, lid)),
                columns: { memberId: true },
            });
            if (!memberLocation) throw new CourseEnrollError(404, "Member not found for this location");

            const duplicate = await db.query.courseEnrollments.findFirst({
                where: and(eq(courseEnrollments.courseId, courseId), eq(courseEnrollments.memberId, memberId)),
                columns: { id: true },
            });
            if (duplicate) throw new CourseEnrollError(409, "Member is already enrolled in this course", "DUPLICATE_ENROLLMENT");
            if (course.price > 0 && !paymentMethodId) throw new CourseEnrollError(400, "Payment method ID is required");

            const enrollment = course.price === 0
                ? await handleCourseEnrollFree({ lid, mid: memberId, courseId })
                : await handleCourseEnrollPaid({
                    lid,
                    mid: memberId,
                    courseId,
                    paymentMethodId: paymentMethodId ?? "",
                    paymentType: paymentType ?? "card",
                    courseTitle: course.title,
                    coursePrice: course.price,
                });
            if (!enrollment) throw new CourseEnrollError(400, "Failed to create enrollment");

            return status(201, { id: enrollment.id, transactionId: enrollment.transactionId ?? null });
        } catch (error) {
            return mapCourseEnrollPaidError(status, error);
        }
    }, {
        body: t.Object({
            memberId: t.String(),
            paymentMethodId: t.Optional(t.String()),
            paymentType: t.Optional(t.Literal("card")),
            attemptId: t.Optional(t.String()),
        }),
    });
