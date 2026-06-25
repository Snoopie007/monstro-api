import { db } from "@/db/db";
import { eventRegistrations, eventTickets, locationEvents } from "@subtrees/schemas";
import { and, count, eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

type EventAccessContext = {
	eventLocationAccess: { allowed: boolean };
};

export const eventTicketRoutes = new Elysia()
	.post("/:eventId/tickets", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId } = params as { lid: string; eventId: string };
		const body = ctx.body;
		const [event] = await db
			.select({ id: locationEvents.id })
			.from(locationEvents)
			.where(and(eq(locationEvents.id, eventId), eq(locationEvents.locationId, lid)))
			.limit(1);
		if (!event) return status(404, { error: "Event not found" });

		const [ticket] = await db.insert(eventTickets).values({
			eventId,
			name: body.name,
			pricingMethod: body.pricingMethod,
			price: body.pricingMethod === "free" ? 0 : body.price,
			quantity: body.quantity === "" || body.quantity == null ? null : Number(body.quantity),
			saleStartsAt: body.saleStartsAt ? new Date(body.saleStartsAt) : null,
			saleEndsAt: body.saleEndsAt ? new Date(body.saleEndsAt) : null,
			status: body.status ?? "active",
		}).returning();

		return status(201, ticket);
	}, {
		body: t.Object({
			name: t.String(),
			pricingMethod: t.Union([t.Literal("free"), t.Literal("fixed")]),
			price: t.Number(),
			quantity: t.Optional(t.Union([t.String(), t.Number(), t.Null()])),
			saleStartsAt: t.Optional(t.String()),
			saleEndsAt: t.Optional(t.String()),
			status: t.Optional(t.Union([t.Literal("active"), t.Literal("closed")])),
		}),
	})
	.patch("/:eventId/tickets/:ticketId", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId, ticketId } = params as { lid: string; eventId: string; ticketId: string };
		const body = ctx.body;
		const [event] = await db
			.select({ id: locationEvents.id })
			.from(locationEvents)
			.where(and(eq(locationEvents.id, eventId), eq(locationEvents.locationId, lid)))
			.limit(1);
		if (!event) return status(404, { error: "Event not found" });

		const [sold] = await db
			.select({ count: count() })
			.from(eventRegistrations)
			.where(and(eq(eventRegistrations.ticketId, ticketId), eq(eventRegistrations.status, "registered")));
		const soldCount = sold?.count ?? 0;
		const [current] = soldCount
			? await db.select().from(eventTickets).where(and(eq(eventTickets.id, ticketId), eq(eventTickets.eventId, eventId))).limit(1)
			: [];
		const values = {
			eventId,
			name: body.name,
			pricingMethod: body.pricingMethod,
			price: body.pricingMethod === "free" ? 0 : body.price,
			quantity: body.quantity === "" || body.quantity == null ? null : Number(body.quantity),
			saleStartsAt: body.saleStartsAt ? new Date(body.saleStartsAt) : null,
			saleEndsAt: body.saleEndsAt ? new Date(body.saleEndsAt) : null,
			status: body.status ?? "active",
		};

		if (current && (current.price !== values.price || current.pricingMethod !== values.pricingMethod)) return status(400, { error: "Cannot change sold ticket pricing" });
		if (values.quantity != null && values.quantity < soldCount) return status(400, { error: "Quantity is below sold count" });

		const [ticket] = await db
			.update(eventTickets)
			.set({ ...values, updated: new Date() })
			.where(and(eq(eventTickets.id, ticketId), eq(eventTickets.eventId, eventId)))
			.returning();

		return ticket || status(404, { error: "Not found" });
	}, {
		body: t.Object({
			name: t.String(),
			pricingMethod: t.Union([t.Literal("free"), t.Literal("fixed")]),
			price: t.Number(),
			quantity: t.Optional(t.Union([t.String(), t.Number(), t.Null()])),
			saleStartsAt: t.Optional(t.String()),
			saleEndsAt: t.Optional(t.String()),
			status: t.Optional(t.Union([t.Literal("active"), t.Literal("closed")])),
		}),
	})
	.delete("/:eventId/tickets/:ticketId", async (ctx) => {
		const { params, status, eventLocationAccess } = ctx as typeof ctx & EventAccessContext;
		if (!eventLocationAccess.allowed) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

		const { lid, eventId, ticketId } = params as { lid: string; eventId: string; ticketId: string };
		const [event] = await db
			.select({ id: locationEvents.id })
			.from(locationEvents)
			.where(and(eq(locationEvents.id, eventId), eq(locationEvents.locationId, lid)))
			.limit(1);
		if (!event) return status(404, { error: "Event not found" });

		const [sold] = await db
			.select({ count: count() })
			.from(eventRegistrations)
			.where(and(eq(eventRegistrations.ticketId, ticketId), eq(eventRegistrations.status, "registered")));
		if (sold?.count) return status(400, { error: "Cannot delete a sold ticket option" });

		await db.delete(eventTickets).where(and(eq(eventTickets.id, ticketId), eq(eventTickets.eventId, eventId)));
		return { success: true };
	});
