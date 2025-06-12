import { db } from "@/db/db";
import { CalendarEvent, Reservation } from "@/types";
import { endOfMonth, startOfMonth, addDays } from "date-fns";
import { NextResponse, NextRequest } from "next/server";

export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const { searchParams } = new URL(req.url);
    const params = await props.params;
    const date = searchParams.get("date");
    const startDate = startOfMonth(new Date(date || new Date()));
    const endDate = endOfMonth(startDate);

    try {
        let events: CalendarEvent[] = [];

        // First, get all programs for this location
        const locationPrograms = await db.query.programs.findMany({
            where: (p, { eq }) => eq(p.locationId, params.id),
            columns: {
                id: true
            }
        });

        const programIds = locationPrograms.map(p => p.id);

        // Then get all sessions for these programs
        const locationSessions = await db.query.programSessions.findMany({
            where: (s, { inArray }) => inArray(s.programId, programIds),
            with: {
                program: true
            }
        });

        // Get standard reservations
        const reservations = await db.query.reservations.findMany({
            where: (r, { between, and, eq }) => and(
                between(r.startDate, startDate.toISOString(), endDate.toISOString()),
                eq(r.locationId, params.id)
            ),
            with: {
                member: true,
                session: {
                    with: {
                        program: true
                    }
                }
            }
        });

        // Get recurring reservations
        const recurrings = await db.query.recurringReservations.findMany({
            where: (r, { and, eq, gte, or, isNull, lte }) => and(
                lte(r.startDate, startDate.toISOString()),
                eq(r.locationId, params.id),
                or(
                    isNull(r.canceledOn),
                    gte(r.canceledOn, startDate.toISOString())
                )
            ),
            with: {
                member: true,
                session: {
                    with: {
                        program: true
                    }
                },
                exceptions: true
            }
        });

        // Generate available session slots
        locationSessions.forEach(session => {
            if (!session.program) return;

            let currentDate = new Date(startDate);
            const sessionDay = session.day;
            const currentDay = currentDate.getDay();

            if (currentDay !== sessionDay) {
                currentDate = addDays(currentDate, (sessionDay - currentDay + 7) % 7);
            }

            while (currentDate <= endDate) {
                const [hours, minutes] = session.time.split(':');
                const start = new Date(`${currentDate.toISOString().split('T')[0]}T${hours}:${minutes}:00`);
                const end = new Date(start.getTime() + session.duration * 60000);

                const id = `${start.toISOString()}-${session.id}`;

                // Check if this session already has a reservation
                const hasReservation = reservations.some(r => 
                    r.sessionId === session.id && 
                    new Date(r.startDate).toDateString() === currentDate.toDateString()
                ) || recurrings.some(r => 
                    r.sessionId === session.id && 
                    r.session?.day === session.day
                );

                if (!hasReservation) {
                    events.push({
                        id,
                        title: session.program.name,
                        start,
                        end,
                        duration: session.duration,
                        data: {
                            sessionId: session.id,
                            programId: session.program.id,
                            members: [],
                            isRecurring: false
                        }
                    });
                }

                currentDate = addDays(currentDate, 7);
            }
        });

        // Process recurring reservations
        recurrings.forEach(recurring => {
            if (!recurring.session || !recurring.member) return;

            let currentDate = new Date(startDate);
            const sessionDay = recurring.session.day;
            const currentDay = currentDate.getDay();

            if (currentDay !== sessionDay) {
                currentDate = addDays(currentDate, (sessionDay - currentDay + 7) % 7);
            }

            while (currentDate <= endDate) {
                const exception = recurring.exceptions?.find(e =>
                    new Date(e.occurrenceDate).toDateString() === currentDate.toDateString()
                );

                if (!exception) {
                    const { id, intervalThreshold, interval, exceptions, ...rest } = recurring;
                    const vr: Reservation = {
                        ...rest,
                        startDate: currentDate.toISOString().split('T')[0]
                    };
                    addEventToCalendar(events, vr, recurring.id);
                }
                currentDate = addDays(currentDate, (recurring.intervalThreshold || 1) * 7);
            }
        });

        // Process standard reservations
        reservations.forEach(reservation => {
            addEventToCalendar(events, reservation);
        });

        // Merge duplicates and filter by date range
        const finalEvents = mergeAndFilterEvents(events, startDate, endDate);

        return NextResponse.json(finalEvents, { status: 200 });
    } catch (err) {
        console.error("Error fetching calendar events:", err);
        return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
    }
}

function addEventToCalendar(
    events: CalendarEvent[],
    reservation: Reservation,
    recurringId?: number
) {
    if (!reservation.session || !reservation.member || !reservation.session.program) return;

    const [hours, minutes] = reservation.session.time.split(':');
    const start = new Date(`${reservation.startDate}T${hours}:${minutes}:00`);
    const end = new Date(start.getTime() + reservation.session.duration * 60000);

    const id = `${start.toISOString()}-${reservation.session.id}`;

    const member = {
        memberId: reservation.member.id,
        name: `${reservation.member.firstName} ${reservation.member.lastName}`,
        avatar: reservation.member.avatar
    };

    const existingIndex = events.findIndex(e => 
        e.id === id || 
        (e.data?.sessionId === reservation.session?.id && 
         e.start.toISOString() === start.toISOString())
    );

    if (existingIndex >= 0) {
        // Merge with existing event
        const event = events[existingIndex];
        if (event.data) {
            event.data.members = [...(event.data.members || []), member];
            event.data.reservationId = reservation.id || undefined;
            event.data.recurringId = recurringId;
            event.data.isRecurring = !!recurringId;
            event.data.memberPlanId = reservation.memberPackageId || reservation.memberSubscriptionId || undefined;
        }
    } else {
        // Create new event
        events.push({
            id, 
            title: reservation.session.program.name,
            start,
            end,
            duration: reservation.session.duration,
            data: {
                sessionId: reservation.session.id,
                memberPlanId: reservation.memberPackageId || reservation.memberSubscriptionId || undefined,
                programId: reservation.session.program.id,
                reservationId: reservation.id || undefined,
                recurringId,
                members: [member],
                isRecurring: !!recurringId,
            }
        });
    }
}

function mergeAndFilterEvents(events: CalendarEvent[], startDate: Date, endDate: Date): CalendarEvent[] {
    const mergedEvents: CalendarEvent[] = [];
    const eventMap = new Map<string, CalendarEvent>();

    events.forEach(event => {
        // Filter out events outside our date range
        const eventDate = new Date(event.start);
        if (eventDate < startDate || eventDate > endDate) return;

        const existingEvent = eventMap.get(event.id);
        
        if (existingEvent) {
            // Merge members if they exist in the new event
            if (event.data?.members?.length) {
                existingEvent.data.members = [
                    ...(existingEvent.data.members || []),
                    ...event.data.members
                ];
            }
            // Update reservation data if present in new event
            if (event.data?.reservationId) {
                existingEvent.data.reservationId = event.data.reservationId;
            }
            if (event.data?.recurringId) {
                existingEvent.data.recurringId = event.data.recurringId;
            }
            if (event.data?.memberPlanId) {
                existingEvent.data.memberPlanId = event.data.memberPlanId;
            }
            existingEvent.data.isRecurring = !!existingEvent.data.recurringId;
        } else {
            eventMap.set(event.id, { ...event });
        }
    });

    return Array.from(eventMap.values());
}