import { canAccessLocation } from "@/utils/merchandise";
import { Elysia, type Context } from "elysia";
import { eventDetailRoutes } from "./detail";
import { eventListRoutes } from "./list";
import { eventRegistrationRoutes } from "./registrations";
import { eventTicketRoutes } from "./tickets";
import { eventUploadRoutes } from "./upload";

type XAuthContext = Context & { vendorId?: string; staffId?: string };

export const xEvents = new Elysia({ prefix: "/events" })
	.resolve(async (ctx) => {
		const { lid } = ctx.params as { lid: string };
		const { vendorId, staffId } = ctx as XAuthContext;
		return { eventLocationAccess: await canAccessLocation(lid, vendorId, staffId) };
	})
	.use(eventListRoutes)
	.use(eventUploadRoutes)
	.use(eventDetailRoutes)
	.use(eventTicketRoutes)
	.use(eventRegistrationRoutes);
