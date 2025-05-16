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
                    e.occurrenceDate === currentDate.toISOString().split('T')[0]
                );

                if (exception) {
                    currentDate = addDays(currentDate, (recurring.intervalThreshold || 1) * 7);
                    continue;
                }

                const { id, intervalThreshold, interval, exceptions, ...rest } = recurring;
                const vr: Reservation = {
                    ...rest,
                    startDate: currentDate.toISOString().split('T')[0]
                };

                addEventToCalendar(events, vr, recurring.id);
                // Move to next occurrence based on interval
                currentDate = addDays(currentDate, (recurring.intervalThreshold || 1) * 7);
            }
        });

        // Process standard reservations
        reservations.forEach(reservation => {
            addEventToCalendar(events, reservation);
        });

        return NextResponse.json(events, { status: 200 });
    } catch (err) {
        console.error("Error fetching calendar events:", err);
        return NextResponse.json({ error: "Failed to fetch calendar events" }, { status: 500 });
    }
}

// Helper function to add an event to the calendar
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

    const event = events.find(e => e.id === id);

    if (event && event.data) {
        // Add member to existing event
        event.data.members = [...event.data.members, member];
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
                isRecurring: recurringId ? true : false
            }
        });
    }
}