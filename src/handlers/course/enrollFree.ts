import { db } from "@/db/db";
import {
    courseEnrollments,
} from "@subtrees/schemas";
import { CourseEnrollError } from "./errors";


type CourseEnrollParams = {
    lid: string;
    mid: string;
    courseId: string;
};

export async function handleCourseEnrollFree(params: CourseEnrollParams) {
    const { lid, mid, courseId } = params;
    const now = new Date();
    const [enrollment] = await db.insert(courseEnrollments).values({
        memberId: mid,
        locationId: lid,
        courseId,
        enrolledAt: now,
    }).returning();
    if (!enrollment) {
        throw new CourseEnrollError(400, "Failed to create enrollment");
    }
    return enrollment;
}
