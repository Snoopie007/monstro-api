
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and } from 'drizzle-orm';
import { authenticateMember } from '@/libs/utils';
import { recurringReservations, reservations } from '@/db/schemas';
import { getSessionState, isSessionPasted } from "@/libs/server/db";
import { MemberSubscription, Reservation } from '@/types';

type MemberReservationProps = {
    params: Promise<{ id: number }>
}
type Params = {
    lid: number;
};

export async function GET(req: NextRequest, props: MemberReservationProps) {
    const params = await props.params;

    try {
        const authMember = authenticateMember(req);

        const subscription = await db.query.memberSubscriptions.findFirst({
            where: (s, { eq }) => and(
                eq(s.memberId, Number(authMember.member.id)),
                eq(s.locationId, Number(params.id)),
                eq(s.status, 'active')
            ),
            with: {
                reservations: {
                    with: {
                        session: true,
                        attendance: true, // Join check-in data (1:1)
                    }
                }
            }
        });

        if (!subscription) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        };

        return NextResponse.json({ subscription }, { status: 200 });
    } catch (err) {
        return NextResponse.json({ error: "Server error" }, { status: 500 });
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