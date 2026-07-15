import { db } from "@/db/db";
import { courseEnrollments } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";

type Database = typeof db;
export type CourseProgressStatus = "not_started" | "in_progress" | "completed";

export function deriveCourseProgressStatus(completedCount: number, totalCount: number): CourseProgressStatus {
	if (totalCount === 0 || completedCount === 0) return "not_started";
	return completedCount === totalCount ? "completed" : "in_progress";
}

export async function findOwnedEnrollment(database: Pick<Database, "query">, lid: string, courseId: string, memberId: string) {
	return database.query.courseEnrollments.findFirst({
		where: and(
			eq(courseEnrollments.locationId, lid),
			eq(courseEnrollments.courseId, courseId),
			eq(courseEnrollments.memberId, memberId),
		),
		columns: { id: true },
	});
}
