import { db } from "@/db/db";
import { eventRegistrations, eventTickets, locationEvents, locationState, members, taxRates, transactions } from "@subtrees/schemas";
import { and, count, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

type EventAccessContext = {
	eventLocationAccess: { allowed: boolean };
};

export const eventDetailRoutes = new Elysia()
	.get("/:eventId", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId } = params as { lid: string; eventId: string };

		try {
			const [event] = await db
				.select()
				.from(locationEvents)
				.where(and(eq(locationEvents.id, eventId), eq(locationEvents.locationId, lid)))
				.limit(1);
			if (!event) return status(404, { error: "Not found" });

			const [location] = await db
				.select({ currency: locationState.currency })
				.from(locationState)
				.where(eq(locationState.locationId, lid))
				.limit(1);
			const currency = location?.currency ?? "USD";
			const ticketRows = await db.select().from(eventTickets).where(eq(eventTickets.eventId, eventId));
			const tickets = await Promise.all(ticketRows.map(async (ticket) => {
				const [sold] = await db
					.select({ count: count() })
					.from(eventRegistrations)
					.where(and(eq(eventRegistrations.ticketId, ticket.id), eq(eventRegistrations.status, "registered")));

				return { ...ticket, currency, soldCount: sold?.count ?? 0 };
			}));
			const registrationRows = await db.select({
				id: eventRegistrations.id,
				status: eventRegistrations.status,
				ticketId: eventRegistrations.ticketId,
				ticketName: eventTickets.name,
				ticketPrice: eventTickets.price,
				transactionTotal: transactions.total,
				transactionCurrency: transactions.currency,
				registeredAt: eventRegistrations.registeredAt,
				cancelledAt: eventRegistrations.cancelledAt,
				member: { id: members.id, firstName: members.firstName, lastName: members.lastName, email: members.email, phone: members.phone },
			}).from(eventRegistrations)
				.leftJoin(members, eq(members.id, eventRegistrations.memberId))
				.leftJoin(eventTickets, eq(eventTickets.id, eventRegistrations.ticketId))
				.leftJoin(transactions, eq(transactions.id, eventRegistrations.transactionId))
				.where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.locationId, lid)));
			const registrations = registrationRows.map(({ ticketPrice, transactionTotal, transactionCurrency, ...registration }) => ({
				...registration,
				ticketName: registration.ticketName ?? "Unknown ticket",
				ticketPrice: ticketPrice ?? 0,
				totalAmount: transactionTotal ?? ticketPrice ?? 0,
				currency: transactionCurrency ?? currency,
			}));
			const rates = await db.select().from(taxRates).where(eq(taxRates.locationId, lid));
			const [registered] = await db
				.select({ count: count() })
				.from(eventRegistrations)
				.where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")));

			return { event: { ...event, currency, registeredCount: registered?.count ?? 0, ticketCount: tickets.length }, tickets, registrations, taxRates: rates };
		} catch (error) {
			console.error(error);
			return status(500, { error: "Unable to load event" });
		}
	})
	.patch("/:eventId", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId } = params as { lid: string; eventId: string };
		const body = ctx.body;
		const values = {
			locationId: lid,
			name: body.name,
			summary: body.summary ?? null,
			description: body.description ?? null,
			image: body.image ?? null,
			startsAt: new Date(body.startsAt),
			endsAt: new Date(body.endsAt),
			capacity: body.capacity ?? null,
			eventType: body.eventType ?? "in_person",
			onlineUrl: body.eventType === "online" ? body.onlineUrl ?? null : null,
			venueMode: body.venueMode ?? "location",
			venueAddress: body.venueAddress ?? null,
			...(body.status ? { status: body.status } : {}),
		};

		try {
			const [registered] = await db
				.select({ count: count() })
				.from(eventRegistrations)
				.where(and(eq(eventRegistrations.eventId, eventId), eq(eventRegistrations.status, "registered")));
			const registeredCount = registered?.count ?? 0;

			if (values.capacity != null && values.capacity < registeredCount) return status(400, { error: "Capacity is below registered count" });
			if (values.status === "archived" && registeredCount) return status(400, { error: "Cannot archive an event with registrations" });

			const [event] = await db
				.update(locationEvents)
				.set(values)
				.where(and(eq(locationEvents.id, eventId), eq(locationEvents.locationId, lid)))
				.returning();

			return event || status(404, { error: "Not found" });
		} catch (error) {
			console.error(error);
			return status(500, { error: "Unable to update event" });
		}
	}, {
		body: t.Object({
			name: t.String(),
			summary: t.Optional(t.Nullable(t.String())),
			description: t.Optional(t.Nullable(t.String())),
			image: t.Optional(t.Nullable(t.String())),
			startsAt: t.String(),
			endsAt: t.String(),
			capacity: t.Optional(t.Nullable(t.Number())),
			eventType: t.Optional(t.Union([t.Literal("in_person"), t.Literal("online")])),
			onlineUrl: t.Optional(t.Nullable(t.String())),
			venueMode: t.Optional(t.Union([t.Literal("location"), t.Literal("custom")])),
			venueAddress: t.Optional(t.Nullable(t.String())),
			status: t.Optional(t.Union([t.Literal("draft"), t.Literal("published"), t.Literal("cancelled"), t.Literal("archived")])),
		}),
	});
