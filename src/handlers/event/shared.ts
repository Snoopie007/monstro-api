import { db } from "@/db/db";
import {
    eventRegistrations,
    eventTickets,
    locationEvents,
} from "@subtrees/schemas";
import type { LocationEvent, EventTicket } from "@subtrees/types";
import { and, count, eq, gt, inArray, sql } from "drizzle-orm";

export class EventRegistrationError extends Error {
    readonly status: 202 | 400 | 404 | 409 | 500;
    readonly code?: string;

    constructor(status: 202 | 400 | 404 | 409 | 500, message: string, code?: string) {
        super(message);
        this.name = "EventRegistrationError";
        this.status = status;
        this.code = code;
    }
}

type EventRegistrationInput = {
    lid: string;
    mid: string;
    event: LocationEvent;
    ticket: EventTicket;
} & (
    | { status: "pending"; transactionId: string; registrationId: string }
    | { status: "registered"; transactionId?: string; registrationId?: string }
);

export type LoadEventContextParams = {
    lid: string;
    mid: string;
    eventId: string;
    ticketId: string;
};

type CancelEventRegistrationInput = {
    lid: string;
    eventId: string;
    registrationId: string;
};

export async function loadEventRegistrationContext({
    lid,
    mid,
    eventId,
    ticketId,
}: LoadEventContextParams) {

    const [event, ticket, duplicate] = await Promise.all([
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
                inArray(eventRegistrations.status, ["pending", "registered", "attended"]),
            ),
        }),
    ]);

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

    return { event, ticket };
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
        status,
    }: EventRegistrationInput,
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
    if (duplicate && ["pending", "registered", "attended"].includes(duplicate.status)) {
        throw new EventRegistrationError(409, "Member is already registered for this event");
    }

    const [registered] = await tx.select({ count: count() })
        .from(eventRegistrations)
        .where(and(
            eq(eventRegistrations.eventId, eventId),
            inArray(eventRegistrations.status, ["pending", "registered", "attended"]),
        ));

    if (event.capacity != null && (registered?.count ?? 0) >= event.capacity) {
        throw new EventRegistrationError(409, "Event is sold out");
    }

    const [registration] = await tx.insert(eventRegistrations).values({
        ...(registrationId ? { id: registrationId } : {}),
        eventId,
        memberId: mid,
        ticketId,
        locationId: lid,
        status,
        transactionId,
    }).returning({ id: eventRegistrations.id });
    if (ticket.quantity != null) {
        const [reservedTicket] = await tx.update(eventTickets).set({
            quantity: sql`${eventTickets.quantity} - 1`,
        }).where(and(
            eq(eventTickets.id, ticketId),
            gt(eventTickets.quantity, 0),
        )).returning({ id: eventTickets.id });
        if (!reservedTicket) throw new EventRegistrationError(409, "Ticket is sold out");
    }

    if (!registration) {
        throw new EventRegistrationError(500, "Unable to create registration");
    }

    return registration;
}

export async function completePendingEventRegistration(tx: RegistrationTx, transactionId: string) {
    const [registration] = await tx.update(eventRegistrations).set({
        status: "registered",
        updated: new Date(),
    }).where(and(
        eq(eventRegistrations.transactionId, transactionId),
        eq(eventRegistrations.status, "pending"),
    )).returning({ id: eventRegistrations.id });
    return registration;
}

export async function cancelEventRegistration(
    tx: RegistrationTx,
    { lid, eventId, registrationId }: CancelEventRegistrationInput,
) {
    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${eventId}))`);
    const registration = await tx.query.eventRegistrations.findFirst({
        where: and(
            eq(eventRegistrations.id, registrationId),
            eq(eventRegistrations.eventId, eventId),
            eq(eventRegistrations.locationId, lid),
        ),
    });
    if (!registration) return;
    if (registration.status === "cancelled") return registration;
    if (registration.status === "pending") {
        throw new EventRegistrationError(409, "Payment is still being processed", "PAYMENT_PENDING");
    }
    if (registration.status !== "registered") {
        throw new EventRegistrationError(409, "Only registered attendees can be cancelled");
    }

    const [cancelled] = await tx.update(eventRegistrations).set({
        status: "cancelled",
        cancelledAt: new Date(),
        updated: new Date(),
    }).where(and(
        eq(eventRegistrations.id, registration.id),
        eq(eventRegistrations.status, "registered"),
    )).returning();
    if (!cancelled) {
        throw new EventRegistrationError(409, "Registration could not be cancelled");
    }

    await tx.update(eventTickets).set({
        quantity: sql`case when ${eventTickets.quantity} is null then null else ${eventTickets.quantity} + 1 end`,
    }).where(eq(eventTickets.id, cancelled.ticketId));
    return cancelled;
}

export async function cancelPendingEventRegistration(tx: RegistrationTx, transactionId: string) {
    const registration = await tx.query.eventRegistrations.findFirst({
        where: eq(eventRegistrations.transactionId, transactionId),
        columns: { id: true, eventId: true, ticketId: true, status: true },
    });
    if (!registration || registration.status !== "pending") return;

    await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${registration.eventId}))`);
    const [cancelled] = await tx.update(eventRegistrations).set({
        status: "cancelled",
        cancelledAt: new Date(),
        updated: new Date(),
    }).where(and(
        eq(eventRegistrations.id, registration.id),
        eq(eventRegistrations.status, "pending"),
    )).returning({ ticketId: eventRegistrations.ticketId });
    if (!cancelled) return;

    await tx.update(eventTickets).set({
        quantity: sql`case when ${eventTickets.quantity} is null then null else ${eventTickets.quantity} + 1 end`,
    }).where(eq(eventTickets.id, cancelled.ticketId));
}
