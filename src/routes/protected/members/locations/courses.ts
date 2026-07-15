import { db } from "@/db/db";
import { courseChapters, courseLessons, courses as coursesTable } from "@subtrees/schemas";
import { sql } from "drizzle-orm";
import { Elysia, t } from "elysia";

const MemberLocationCoursesProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};

export function mlCoursesRoutes(app: Elysia) {
    return app.get("/courses", async ({ params, status }) => {
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
}
