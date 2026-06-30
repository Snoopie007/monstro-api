import { db } from "@/db/db";
import {
    eventRegistrations,
    eventTickets,
    locationEvents,
    memberLocations,
} from "@subtrees/schemas";
import type { LocationEvent, EventTicket } from "@subtrees/types";
import { and, count, eq, sql } from "drizzle-orm";

export class EventRegistrationError extends Error {
    readonly status: 400 | 404 | 409 | 500;
    readonly code?: string;

    constructor(status: 400 | 404 | 409 | 500, message: string, code?: string) {
        super(message);
        this.name = "EventRegistrationError";
        this.status = status;
        this.code = code;
    }
}

export type EventRegistrationBaseInput = {
    lid: string;
    mid: string;
    event: LocationEvent;
    ticket: EventTicket;
    transactionId?: string;
    registrationId?: string;
};

export type LoadEventContextParams = {
    lid: string;
    mid: string;
    eventId: string;
    ticketId: string;
};

export async function loadEventRegistrationContext({
    lid,
    mid,
    eventId,
    ticketId,
}: LoadEventContextParams) {

    const [memberLocation, event, ticket, duplicate] = await Promise.all([
        db.query.memberLocations.findFirst({
            where: and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)),
            columns: {
                gatewayCustomerId: true,
            },

        }),
        db.query.locationEvents.findFirst({
            where: and(eq(locationEvents.id, eventId), eq(locationEvents.locationId, lid)),
        }),
        db.query.eventTickets.findFirst({
            where: and(eq(eventTickets.id, ticketId), eq(eventTickets.eventId, eventId)),
        }),
        db.query.eventRegistrations.findFirst({
            where: and(
                eq(eventRegistrations.eventId, eventId),
                eq(eventRegistrations.memberId, mid),
            ),
        }),
    ]);

    if (!memberLocation) {
        throw new EventRegistrationError(404, "Member not found at this location");
    }
    if (!event) {
        throw new EventRegistrationError(404, "Event not found");
    }
    if (!ticket) {
        throw new EventRegistrationError(404, "Ticket not found");
    }
    if (duplicate) {
        throw new EventRegistrationError(409, "Member is already registered for this event");
    }

    const now = new Date();
    if (event.status !== "published" || event.endsAt <= now) {
        throw new EventRegistrationError(400, "Event is not open for registration");
    }
    if (ticket.status !== "active") {
        throw new EventRegistrationError(400, "Ticket is not active");
    }
    if (ticket.quantity != null && ticket.quantity <= 0) {
        throw new EventRegistrationError(409, "Ticket is sold out");
    }
    if (ticket.saleStartsAt && ticket.saleStartsAt > now) {
        throw new EventRegistrationError(400, "Ticket sale has not started");
    }
    if (ticket.saleEndsAt && ticket.saleEndsAt < now) {
        throw new EventRegistrationError(400, "Ticket sale has ended");
    }

    return { memberLocation, event, ticket };
}

type RegistrationTx = Parameters<Parameters<typeof db.transaction>[0]>[0];

export async function createEventRegistration(
    tx: RegistrationTx, {
        lid,
        mid,
        event,
        ticket,
        transactionId,
        registrationId,
    }: EventRegistrationBaseInput,
) {
    const eventId = event.id;
    const ticketId = ticket.id;
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${eventId}))`);

    const duplicate = await tx.query.eventRegistrations.findFirst({
        where: and(
            eq(eventRegistrations.eventId, eventId),
            eq(eventRegistrations.memberId, mid),
        ),
        columns: { id: true, status: true },
    });
    if (duplicate && (duplicate.status === "registered" || duplicate.status === "attended")) {
        throw new EventRegistrationError(409, "Member is already registered for this event");
    }

    /* TODO: Check if event is sold out */
    const [registered] = await tx.select({ count: count() })
        .from(eventRegistrations)
        .where(eq(eventRegistrations.eventId, eventId));

    if (event.capacity != null && (registered?.count ?? 0) >= event.capacity) {
        throw new EventRegistrationError(409, "Event is sold out");
    }

    const [registration] = await tx.insert(eventRegistrations).values({
        ...(registrationId ? { id: registrationId } : {}),
        eventId,
        memberId: mid,
        ticketId,
        locationId: lid,
        transactionId,
    }).returning({ id: eventRegistrations.id });
    /* TODO: Update ticket quantity */
    await tx.update(eventTickets).set({
        quantity: ticket.quantity != null ? ticket.quantity - 1 : null,
    }).where(eq(eventTickets.id, ticketId));

    if (!registration) {
        throw new EventRegistrationError(500, "Unable to create registration");
    }

    return registration;
}
