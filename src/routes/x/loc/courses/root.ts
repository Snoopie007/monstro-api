import { canAccessLocation } from "@/utils/merchandise";
import { Elysia } from "elysia";
import { courseRoutes } from "./courses";
import { courseEnrollmentRoutes } from "@/routes/courses/manualEnrollment";
import { courseLessonAttachmentRoutes } from "./attachments";
import { courseLessonRoutes } from "./lessons";
import type { XAuthContext } from "./shared";
import { courseUploadRoutes } from "./uploads";

const courseManagementRoutes = new Elysia()
	.resolve(async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const { vendorId, staffId } = ctx as XAuthContext;
		return { courseLocationAccess: await canAccessLocation(lid, vendorId, staffId) };
	})
	.use(courseRoutes)
	.use(courseLessonRoutes)
	.use(courseLessonAttachmentRoutes)
	.use(courseUploadRoutes);

export const xCourses = new Elysia({ prefix: "/courses" })
	.use(courseEnrollmentRoutes)
	.use(courseManagementRoutes);
