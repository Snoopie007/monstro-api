import { db } from "@/db/db";
import { courseLessonCompletions } from "@subtrees/schemas";
import { Elysia, t } from "elysia";

const MemberLocationCoursesProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};

export function mlCoursesRoutes(app: Elysia) {
    app.get("/courses", async ({ params, status }) => {
        const { mid, lid } = params;
        try {
            const enrollments = await db.query.courseEnrollments.findMany({
                where: (ce, { eq, and }) => and(eq(ce.memberId, mid), eq(ce.locationId, lid)),
                with: {

                    completions: {
                        columns: {
                            lessonId: true,
                            completedAt: true,
                        },
                    },
                },
            });


            return status(200, enrollments);
        } catch (err) {
            console.error(err);
            return status(500, { error: "Failed to fetch course enrollments" });
        }
    }, MemberLocationCoursesProps);

    app.get("/courses/:courseId/lessons/:lessonId/complete", async ({ params, status }) => {
        const { mid, lid, courseId, lessonId } = params;
        try {
            const enrollment = await db.query.courseEnrollments.findFirst({
                where: (ce, { eq, and }) => and(eq(ce.memberId, mid), eq(ce.locationId, lid), eq(ce.courseId, courseId)),
                columns: {
                    id: true,
                },
            });
            if (!enrollment) {
                return status(404, { error: "Enrollment not found" });
            }
            const completion = await db.insert(courseLessonCompletions).values({
                enrollmentId: enrollment.id,
                lessonId: lessonId,
                completedAt: new Date(),
            });
            return status(200, completion);
        } catch (err) {
            console.error(err);
            return status(500, { error: "Failed to fetch course" });
        }
    }, {
        params: t.Object({
            mid: t.String(),
            lid: t.String(),
            courseId: t.String(),
            lessonId: t.String(),
        }),
    });
    return app;
}
