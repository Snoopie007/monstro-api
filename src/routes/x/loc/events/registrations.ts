import { db } from "@/db/db";
import {
	cancelEventRegistration,
	handleFreeEventRegistration,
	handlePaidEventRegistration,
	mapEventRegistrationError,
} from "@/handlers/event";
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
		const { memberId, ticketId, paymentMethodId, paymentType, attemptId } = ctx.body;

		try {
			const registration = await handlePaidEventRegistration({
				lid,
				mid: memberId,
				eventId,
				ticketId,
				paymentMethodId,
				paymentType,
				attemptId,
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
			attemptId: t.String(),
		}),
	})
	.patch("/:eventId/registrations/:registrationId", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId, registrationId } = params as { lid: string; eventId: string; registrationId: string };
		try {
			const registration = await db.transaction(tx => cancelEventRegistration(tx, { lid, eventId, registrationId }));
			return registration || status(404, { error: "Not found" });
		} catch (error) {
			return mapEventRegistrationError(status, error);
		}
	});
