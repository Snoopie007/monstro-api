import { db } from "@/db/db";
import { eventRegistrations, eventTickets, locationEvents, locationState } from "@subtrees/schemas";
import { and, asc, count, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

type EventAccessContext = {
	eventLocationAccess: { allowed: boolean };
};

export const eventListRoutes = new Elysia()
	.get("/", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid } = params as { lid: string };

		try {
			const [location] = await db
				.select({ currency: locationState.currency })
				.from(locationState)
				.where(eq(locationState.locationId, lid))
				.limit(1);
			const currency = location?.currency ?? "USD";
			const events = await db
				.select()
				.from(locationEvents)
				.where(eq(locationEvents.locationId, lid))
				.orderBy(asc(locationEvents.startsAt));

			return Promise.all(events.map(async (event) => {
				const [registered] = await db
					.select({ count: count() })
					.from(eventRegistrations)
					.where(and(eq(eventRegistrations.eventId, event.id), eq(eventRegistrations.status, "registered")));
				const [tickets] = await db
					.select({ count: count() })
					.from(eventTickets)
					.where(eq(eventTickets.eventId, event.id));

				return {
					...event,
					currency,
					registeredCount: registered?.count ?? 0,
					ticketCount: tickets?.count ?? 0,
				};
			}));
		} catch (error) {
			console.error(error);
			return status(500, { error: "Unable to load events" });
		}
	})
	.post("/", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid } = params as { lid: string };
		const body = ctx.body;

		try {
			const [event] = await db.insert(locationEvents).values({
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
			}).returning();

			return status(201, event);
		} catch (error) {
			console.error(error);
			return status(500, { error: "Unable to create event" });
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
