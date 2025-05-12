
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and } from 'drizzle-orm';
import { authenticateMember } from '@/libs/utils';
import { reservations } from '@/db/schemas';
type MemberReservationProps = {
    params: Promise<{ id: number }>
}

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


export async function POST(req: NextRequest, props: { params: Promise<{ lid: number }> }) {
    const params = await props.params;
    const authMember = authenticateMember(req);
    const body = await req.json();
    const { date, sessionId } = body;

    try {
        // 1. Validate member's active subscription
        const memberSubscription = await db.query.memberSubscriptions.findFirst({
            where: (s, { eq }) => and(
                eq(s.memberId, Number(authMember.member.id)),
                eq(s.locationId, Number(params.lid)),
                eq(s.status, 'active')
            )
        });

        if (!memberSubscription) {
            return NextResponse.json({ error: "No active subscription found" }, { status: 404 });
        }

        // 2. Check if session exists
        const session = await db.query.programSessions.findFirst({
            where: (s, { eq }) => eq(s.id, sessionId),
        });

        if (!session) {
            return NextResponse.json({ error: "Session not found" }, { status: 404 });
        }

        // 3. Prevent duplicate reservations
        const existingReservation = await db.query.reservations.findFirst({
            where: (r, { eq, and }) => and(
                eq(r.memberId, Number(authMember.member.id)),
                eq(r.sessionId, sessionId),
                eq(r.startDate, new Date(date).toISOString().split('T')[0])
            )
        });

        if (existingReservation) {
            return NextResponse.json({ error: "Already reserved for this session/date" }, { status: 409 });
        }

        // 4. Create the reservation (non-recurring)
        const newReservation = await db.insert(reservations).values({
            memberId: Number(authMember.member.id),
            sessionId: sessionId,
            locationId: Number(params.lid),
            startDate: new Date(date).toISOString(), // Convert Date object to ISO string
            memberSubscriptionId: memberSubscription.id, // Link to subscription
        }).returning();

        return NextResponse.json({ reservation: newReservation }, { status: 201 });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Failed to create reservation" }, { status: 500 });
    }
}