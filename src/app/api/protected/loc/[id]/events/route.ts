import { db } from "@/db/db";
import { CalendarEvent } from "@/types";
import { endOfMonth, startOfMonth } from "date-fns";
import { NextResponse, NextRequest } from "next/server";



export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const { searchParams } = new URL(req.url)
    const params = await props.params
    console.log("searchParams", searchParams)
    const date = searchParams.get("date")
    console.log("EVENTS", date)
    const startDate = startOfMonth(new Date(date || new Date()));
    const endDate = endOfMonth(startDate)
    console.log(startDate, endDate)
    try {
        let events: CalendarEvent[] = [];


        let reservations = await db.query.reservations.findMany({
            where: (r, { between, and, eq, or }) => and(

                eq(r.locationId, params.id),
                and(or(
                    between(r.startDate, startDate.toISOString(), endDate.toISOString()),
                    eq(r.auto, true)
                ))
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

        const recurring = reservations.filter(r => r.auto)
        const standard = reservations.filter(r => !r.auto)

        standard.forEach(reservation => {

            const [hours, minutes] = reservation.session.time.split(':');

            const start = new Date(`${reservation.startDate}T${hours}:${minutes}:00`);  // Add one day to fix the date
            const end = new Date(start.getTime() + reservation.session.duration * 60000);

            const id = `${start.toISOString()}-${reservation.session.program.id}`;

            const event = events.find(e => e.id === id);

            const member = {
                memberId: reservation.member?.id,
                name: `${reservation.member?.firstName} ${reservation.member?.lastName}`,
                avatar: reservation.member?.avatar
            }

            if (event && event.data) {
                // Safely access and update members array
                const members = Array.isArray(event.data.members) ? event.data.members : [];

                event.data = {
                    ...event.data,
                    members: [
                        ...members,
                        member
                    ]
                };
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
                        programId: reservation.session.program.id,
                        reservationId: reservation.id,
                        members: [member]
                    }
                });
            }
        });
        console.log(events)
        return NextResponse.json(events, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}