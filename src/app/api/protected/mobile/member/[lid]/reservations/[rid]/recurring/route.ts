import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq, isNull } from 'drizzle-orm';
import { authenticateMember } from '@/libs/utils';
import { reservations, recurringReservations, recurringReservationsExceptions } from '@/db/schemas';

export async function DELETE(req: NextRequest, props: { params: Promise<{ lid: string, rid: string}> }) {

    const date = req.nextUrl.searchParams.get('date');
    
    if (!date) {
        return NextResponse.json(
            { error: "Date query parameter is required (e.g., ?date=2025-06-12)" },
            { status: 400 }
        );
    }
    const params = await props.params;
    const authMember = authenticateMember(req);

    try {
        // console.log(authMember.member.id)
        const exceptionDate = new Date(date);
        if (isNaN(exceptionDate.getTime())) {
            return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
        }

         const reservationException = await db.query.recurringReservationsExceptions.findFirst({
            where: (e, { eq, and }) => and(
                eq(e.recurringReservationId, params.rid),
                eq(e.occurrenceDate, exceptionDate)
            )
        });

        if (reservationException) {
            return NextResponse.json({ error: "This reservation exception already exists" }, { status: 400 });
        }
        
        const recurringreservation = await db.query.recurringReservations.findFirst({
            where: (r, { eq, and }) => and(
                eq(r.id, params.rid),
                eq(r.memberId, authMember.member.id),
                eq(r.locationId, params.lid),
                isNull(r.canceledOn)
            ),
            with: {
                session: {
                    with: {
                        program: true
                    }
                },
                memberSubscription: true
            }
        });

       

        if (!recurringreservation) {
            return NextResponse.json({ error: "Reservation not found or not authorized" }, { status: 404 });
        }

        const currentDate = new Date();
        const reservationDate = new Date(recurringreservation.startDate);
        console.log("Reservation Date: ", reservationDate, "Current Date: ", currentDate);


        if (reservationDate > currentDate) {
            return NextResponse.json({ error: "Cannot cancel past reservations" }, { status: 400 });
        }

        if (recurringreservation.session?.program?.allowWaitlist) {
            console.log(`Waitlist notification needed for session ${recurringreservation.sessionId}`);
        }
        await db.insert(recurringReservationsExceptions).values({
            recurringReservationId: params.rid,
            occurrenceDate: exceptionDate,
        });

        // await db.delete(reservations).where(eq(reservations.id, params.rid));

        return NextResponse.json({
            message: `Reservation for ${exceptionDate.toISOString()} deleted successfully`,
        }, { status: 200 });

    } catch (err) {
        console.error(err);
        return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }
}