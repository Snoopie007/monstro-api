import { db } from "@/db/db";
import {
	handleFreeEventRegistration,
	handlePaidEventRegistration,
	mapEventRegistrationError,
} from "@/handlers/event";
import { eventRegistrations } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

type EventAccessContext = {
	eventLocationAccess: { allowed: boolean };
};

const RegistrationBody = t.Object({
	memberId: t.String(),
	ticketId: t.String(),
});

export const eventRegistrationRoutes = new Elysia()
	.post("/:eventId/register/free", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId } = params as { lid: string; eventId: string };
		const { memberId, ticketId } = ctx.body;

		try {
			const registration = await handleFreeEventRegistration({
				lid,
				mid: memberId,
				eventId,
				ticketId,
			});
			return status(201, registration);
		} catch (error) {
			return mapEventRegistrationError(status, error);
		}
	}, {
		body: RegistrationBody,
	})
	.post("/:eventId/register", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId } = params as { lid: string; eventId: string };
		const { memberId, ticketId, paymentMethodId, paymentType } = ctx.body;

		try {
			const registration = await handlePaidEventRegistration({
				lid,
				mid: memberId,
				eventId,
				ticketId,
				paymentMethodId,
				paymentType,
			});
			return status(201, registration);
		} catch (error) {
			return mapEventRegistrationError(status, error);
		}
	}, {
		body: t.Object({
			...RegistrationBody.properties,
			paymentMethodId: t.String(),
			paymentType: t.Optional(t.Union([t.Literal("card"), t.Literal("us_bank_account")])),
		}),
	})
	.patch("/:eventId/registrations/:registrationId", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId, registrationId } = params as { lid: string; eventId: string; registrationId: string };
		const [registration] = await db
			.update(eventRegistrations)
			.set({ status: "cancelled", cancelledAt: new Date(), updated: new Date() })
			.where(and(eq(eventRegistrations.id, registrationId), eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.locationId, lid)))
			.returning();

		return registration || status(404, { error: "Not found" });
	});
