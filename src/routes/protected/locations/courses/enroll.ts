import type { Elysia } from "elysia";
import { t } from "elysia";
import { handleCourseEnrollPaid, handleCourseEnrollFree, CourseEnrollError } from "@/handlers/course";
import { db } from "src/db/db";

export function locationCoursesEnroll(app: Elysia) {
    return app.post("/courses/enroll", async ({ params, status, body }) => {
        const { lid } = params;
        const { paymentMethodId, courseId, mid, paymentType } = body;

        try {
            const course = await db.query.courses.findFirst({
                where: (c, { eq }) => eq(c.id, courseId),
                columns: {
                    title: true,
                    price: true,
                },
            });
            if (!course) {
                throw new CourseEnrollError(404, "Course not found");
            }

            if (course.price <= 0) {
                const enrollment = await handleCourseEnrollFree({
                    lid,
                    mid,
                    courseId,
                });
                return status(200, enrollment);
            } else {
                if (!paymentMethodId || !paymentType) {
                    throw new CourseEnrollError(400, "Payment method ID and payment type are required");
                }
                const enrollment = await handleCourseEnrollPaid({
                    lid,
                    mid,
                    courseId,
                    paymentMethodId,
                    paymentType,
                    courseTitle: course.title,
                    coursePrice: course.price,
                });
                return status(200, enrollment);
            }


        } catch (error) {

            console.error(error);
            if (error instanceof CourseEnrollError) {
                return status(error.status, { error: error.message });
            }
            return status(500, { error: "Failed to enroll in course" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
        }),
        body: t.Object({
            mid: t.String(),
            courseId: t.String(),
            paymentMethodId: t.Optional(t.String()),
            paymentType: t.Optional(t.Union([
                t.Literal("card"),
                t.Literal("us_bank_account"),
            ])),
        }),
    });
}
