import { db } from "@/db/db";
import { courseChapters, courseLessons, courses as coursesTable } from "@subtrees/schemas";
import { sql } from "drizzle-orm";
import type { Elysia } from "elysia";
import { t } from "elysia";
import { locationCoursesEnroll } from "./enroll";

const LocationCoursesProps = {
    params: t.Object({
        lid: t.String(),
    }),
};

export async function locationCourses(app: Elysia) {
    app.get("/courses", async ({ params, status }) => {
        const { lid } = params;

        try {
            const courses = await db.query.courses.findMany({
                where: (c, { eq, and }) => and(eq(c.locationId, lid), eq(c.status, "published")),

                extras: {
                    chapterCount: sql<number>`(
                        SELECT COUNT(*)::int
                        FROM ${courseChapters}
                        WHERE ${courseChapters.courseId} = ${coursesTable}."id"
                    )`.as("chapter_count"),
                    lessonCount: sql<number>`(
                        SELECT COUNT(*)::int
                        FROM ${courseLessons}
                        INNER JOIN ${courseChapters}
                            ON ${courseChapters}."id" = ${courseLessons.chapterId}
                        WHERE ${courseChapters.courseId} = ${coursesTable}."id"
                    )`.as("lesson_count"),
                },
            });
            return status(200, courses);
        } catch (error) {
            console.error(error);
            return status(500, "Failed to fetch courses");
        }
    }, LocationCoursesProps);

    app.get("/courses/:id", async ({ params, status }) => {
        const { lid, id } = params;
        try {
            const course = await db.query.courses.findFirst({
                where: (c, { eq, and }) => and(eq(c.id, id), eq(c.locationId, lid)),
                with: {
                    chapters: {
                        orderBy: (ch, { asc }) => [asc(ch.sortOrder)],
                        with: {
                            lessons: {
                                orderBy: (l, { asc }) => [asc(l.sortOrder)],
                                columns: {
                                    id: true,
                                    title: true,
                                    summary: true,
                                    sortOrder: true,
                                    status: true,
                                },
                            },
                        },
                    },
                },
            });
            if (!course) {
                return status(404, "Course not found");
            }
            return status(200, course);
        } catch (error) {
            console.error(error);
            return status(500, "Failed to fetch course");
        }
    }, {
        params: t.Object({
            lid: t.String(),
            id: t.String(),
        }),
    });

    app.get("/courses/:id/lessons/:lessonId", async ({ params, status }) => {
        const { lessonId } = params;

        try {
            const lesson = await db.query.courseLessons.findFirst({
                where: (cl, { eq }) => eq(cl.id, lessonId),
            });

            return status(200, lesson);
        }
        catch (error) {
            console.error(error);
            return status(500, "Failed to fetch lesson");
        }
    }, {
        params: t.Object({
            lid: t.String(),
            id: t.String(),
            lessonId: t.String(),
        }),
    });

    app.use(locationCoursesEnroll);

    return app;
}
