import { db } from "@/db/db";
import { CalendarEvent } from "@/types";
import { NextResponse, NextRequest } from "next/server";



export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const { searchParams } = new URL(req.url)
    const params = await props.params
    const date = searchParams.get("date")

    const startDate = new Date(date || new Date());
    startDate.setDate(1);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
    endDate.setDate(0); // Last day of the current month

    try {
        let events: CalendarEvent[] = [];
        const programs = await db.query.programs.findMany({
            where: (p, { eq, and }) => and(eq(p.locationId, params.id), eq(p.status, 'active')),
            with: {
                sessions: {
                    with: {
                        reservations: {
                            where: (r, { between, or, eq }) => or(
                                between(r.startDate, startDate.toISOString(), endDate.toISOString()),
                                eq(r.auto, true)
                            )
                        }
                    }
                }
            }
        })

        // Create a map of all dates in the month
        const daysInMonth = new Map<number, Date[]>();
        const tempDate = new Date(startDate);

        // Pre-calculate all dates in the month grouped by day of week (0-6)
        while (tempDate <= endDate) {
            const dayOfWeek = tempDate.getDay();
            if (!daysInMonth.has(dayOfWeek)) {
                daysInMonth.set(dayOfWeek, []);
            }
            daysInMonth.get(dayOfWeek)!.push(new Date(tempDate));
            tempDate.setDate(tempDate.getDate() + 1);
        }

        programs.forEach(program => {
            program.sessions.forEach(session => {
                // Convert session.day (1-7, Monday-Sunday) to JavaScript's day format (0-6, Sunday-Saturday)
                const sessionDayJS = session.day % 7; // Convert 1-7 to 0-6 format (7 becomes 0)

                // Get all dates that match this session's day of week
                const sessionDates = daysInMonth.get(sessionDayJS) || [];

                // Parse the time (assuming format like "14:00")
                const [hours, minutes] = session.time.split(':').map(Number);

                // Create an event for each occurrence of the session in the month
                sessionDates.forEach(date => {
                    const start = new Date(date);
                    start.setHours(hours, minutes, 0, 0);

                    const end = new Date(start.getTime() + session.duration * 60000);

                    events.push({
                        id: `${program.id}-${session.id}-${start.toISOString()}`,
                        title: program.name,
                        start: start,
                        duration: session.duration,
                        end: end,
                        data: {
                            programId: program.id,
                            sessionId: session.id,
                            reservationCounts: session.reservations.length
                        }
                    });
                });
            });
        });

        return NextResponse.json(events, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}