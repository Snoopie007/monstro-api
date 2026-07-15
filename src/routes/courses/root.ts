import { enrollAuthenticatedMemberInCourse } from "@/handlers/course/enrollment";
import { memberCourseEnrollmentHttpError } from "@/handlers/course/shared";
import { AuthMiddleware } from "@/middlewares";
import { Elysia, t } from "elysia";
import { memberCourseProgressRoutes } from "./progress";

export const MemberCourseRoutes = new Elysia()
	.group("/locations/:lid/courses", (app) => app
		.use(AuthMiddleware)
		.post("/:courseId/enrollments", async ({ params, body, memberId, status }) => {
			try {
				const result = await enrollAuthenticatedMemberInCourse({
					lid: params.lid,
					courseId: params.courseId,
					memberId,
					body,
				});
				return status(201, result);
			} catch (error) {
				const mapped = memberCourseEnrollmentHttpError(error);
				return status(mapped.status, mapped.body);
			}
		}, {
			body: t.Object({
				paymentMethodId: t.Optional(t.String()),
				paymentType: t.Optional(t.Literal("card")),
				attemptId: t.Optional(t.String({ minLength: 1, maxLength: 64, pattern: "^[A-Za-z0-9_-]+$" })),
			}, { additionalProperties: true }),
		})
		.use(memberCourseProgressRoutes));
