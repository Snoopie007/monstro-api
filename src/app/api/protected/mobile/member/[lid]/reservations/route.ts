
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq } from 'drizzle-orm';
import { authenticateMember } from '@/libs/utils';
import { recurringReservations, reservations } from '@/db/schemas';
import { getSessionState, isSessionPasted } from "@/libs/server/db";
import { MemberSubscription, Reservation } from '@/types';
import { addDays } from 'date-fns';

type MemberReservationProps = {
    params: Promise<{ id: number }>
}
type Params = {
    lid: number;
};

export async function GET(request: NextRequest, props: { params: Promise<{ lid: number }> }) {
    const { searchParams } = new URL(request.url);
    const sessionIds = searchParams.get("sessionIds");
    const date = searchParams.get("date");

    const params = await props.params;

    try {
        const authMember = authenticateMember(request);
        if (!authMember || !authMember.member) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const locationId = Number(params.lid);
        if (isNaN(locationId)) {
            return NextResponse.json({ error: "Invalid location ID" }, { status: 400 });
        }

        if (!date) {
            return NextResponse.json({ error: "Date is required" }, { status: 400 });
        }

        console.log("Resolved IDs => memberId:", authMember.member.id, "locationId:", locationId);

        // Parse session IDs if provided
        const ids = sessionIds 
            ? sessionIds.split(",")
                .map(id => parseInt(id))
                .filter(id => !isNaN(id))
            : [];

        const startDate = new Date(date);
        const endDate = addDays(startDate, 6);

        // Get all reservations for the member in this date range
        const allReservations = await db.query.reservations.findMany({
            where: (r, { and, between, inArray, eq }) => and(
                eq(r.memberId, Number(authMember.member.id)),
                ...(ids.length > 0 ? [inArray(r.sessionId, ids)] : []),
                between(r.startDate, startDate.toISOString(), endDate.toISOString())
            ),
            with: {
                session: true,
                attendance: true
            }
        });

        // Get member's active subscription
        const subscription = await db.query.memberSubscriptions.findFirst({
            where: (s, { and, eq }) => and(
                eq(s.memberId, Number(authMember.member.id)),
                eq(s.locationId, locationId),
                eq(s.status, 'active')
            )
        });

        if (!subscription) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        }

        // Get recurring reservations
        const recurrings = await db.query.recurringReservations.findMany({
            where: (rr, { and, inArray, lte, or, isNull, gte, eq }) => and(
                eq(rr.memberId, Number(authMember.member.id)),
                ...(ids.length > 0 ? [inArray(rr.sessionId, ids)] : []),
                lte(rr.startDate, endDate.toISOString()),
                or(
                    isNull(rr.canceledOn),
                    gte(rr.canceledOn, startDate.toISOString())
                )
            ),
            with: {
                exceptions: true,
                session: true
            }
        });

        // Generate recurring reservation instances
        const generatedRecurringReservations: Reservation[] = [];
        for (const r of recurrings) {
            if (!r.session) continue;

            let currentDate = new Date(startDate);
            const sessionDay = r.session.day;
            
            // Adjust to the next occurrence of this session's day
            if (currentDate.getDay() !== sessionDay) {
                currentDate = addDays(currentDate, (sessionDay - currentDate.getDay() + 7) % 7);
            }

            while (currentDate <= endDate) {
                const currentDateString = currentDate.toISOString().split('T')[0];
                
                // Check for exceptions or existing reservations with same date and session ID
                const exception = r.exceptions?.find(e => e.occurrenceDate === currentDateString);
                const existingReservation = allReservations.find(res => 
                    res.startDate === currentDateString && res.sessionId === r.sessionId
                );

                if (exception || existingReservation) {
                    currentDate = addDays(currentDate, (r.intervalThreshold || 1) * 7);
                    continue;
                }

                generatedRecurringReservations.push({
                    ...r,
                    id: 0, // Placeholder since these are virtual reservations
                    recurringId: r.id,
                    isRecurring: true,
                    startDate: currentDate.toISOString(),
                    memberSubscriptionId: subscription.id,
                    session: r.session // Preserve session information
                });

                // Move to next interval
                currentDate = addDays(currentDate, (r.intervalThreshold || 1) * 7);
            }
        }

        return NextResponse.json([
            ...allReservations,
            ...generatedRecurringReservations
        ], { status: 200 });

    } catch (error) {
        console.error("Error fetching reservations:", error);
        return NextResponse.json({ 
            error: "Internal server error",
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}


export async function POST(req: NextRequest, props: { params: Promise<Params> }) {
    const { startdate, sessionId, ...rest } = await req.json();
    const { lid } = await props.params;
    const authMember = authenticateMember(req);
    const mid = Number(authMember.member.id);

    console.log(startdate, sessionId, rest);

    try {
        // 1. Validate member's active subscription
        const memberPlan: MemberSubscription | undefined = await db.query.memberSubscriptions.findFirst({
            where: (s, { eq, and }) => and(
                eq(s.memberId, mid),
                eq(s.locationId, lid),
                eq(s.status, 'active')
            ),
            with: {
                plan: true
            }
        });

        if (!memberPlan) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        }

        console.log("Member Plan: ", memberPlan.id);


        // 2. Check if session exists with additional data
        const session = await db.query.programSessions.findFirst({
            where: (s, { eq }) => eq(s.id, sessionId),
            with: {
                program: true,
                reservations: {
                    where: (r, { eq }) => eq(r.startDate, startdate.split("T")[0])
                },
                recurringReservations: {
                    where: (rr, { lte, isNull, and }) => and(
                        lte(rr.startDate, startdate.split("T")[0]),
                        isNull(rr.canceledOn)
                    ),
                    with: {
                        exceptions: true
                    }
                }
            }
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // 3. Check if session is in the past
        const isPasted = isSessionPasted(session, startdate);
        if (isPasted) {
            return NextResponse.json({ error: "Session is in the past" }, { status: 400 });
        }

        // 4. Check session state
        const sessionState = getSessionState(session, mid);
        if (sessionState.isFull || sessionState.isReserved) {
            const error = sessionState.isReserved ? "Session is already reserved" : "Session is full";
            return NextResponse.json({ error }, { status: 400 });
        }

        let reservation: Reservation;
        if (!rest.recurring) {
            const r = await db.insert(reservations).values({
                memberId: mid,
                locationId: lid,
                sessionId: sessionId,
                startDate: startdate,
                memberSubscriptionId: memberPlan.id
            }).returning();
            reservation = r[0];
        } else {
            const rr = await db.insert(recurringReservations).values({
                memberId: mid,
                locationId: lid,
                sessionId: sessionId,
                startDate: startdate,
            }).returning();
            const { id, intervalThreshold, interval, ...rest } = rr[0];
            reservation = {
                ...rest,
                startDate: startdate,
                isRecurring: true,
                recurringId: id
            };
        }

        return NextResponse.json(reservation, { status: 200 });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
    }
}