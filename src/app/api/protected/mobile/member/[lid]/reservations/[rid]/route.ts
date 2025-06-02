import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { and, eq, isNull } from 'drizzle-orm';
import { authenticateMember } from '@/libs/utils';
import { reservations, recurringReservations, recurringReservationsExceptions } from '@/db/schemas';

export async function DELETE(req: NextRequest, props: { params: Promise<{ lid: number, rid: number }> }) {
  const params = await props.params;
  const authMember = authenticateMember(req);

  try {
    console.log(authMember.member.id)
      // 1. Find the reservation with all necessary relations
      const reservation = await db.query.reservations.findFirst({
          where: (r, { eq, and }) => and(
              eq(r.id, params.rid),
              eq(r.memberId, Number(authMember.member.id)),
              eq(r.locationId, Number(params.lid))
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

      if (!reservation) {
          return NextResponse.json({ error: "Reservation not found or not authorized" }, { status: 404 });
      }

      // 2. Check if reservation is in the future (can't cancel past reservations)
      const currentDate = new Date();
      const reservationDate = new Date(reservation.startDate);
      
      if (reservationDate > currentDate) {
          return NextResponse.json({ error: "Cannot cancel past reservations" }, { status: 400 });
      }

      // 3. Handle waitlist notification if applicable
      if (reservation.session?.program?.allowWaitlist) {
          console.log(`Waitlist notification needed for session ${reservation.sessionId}`);
      }

      // 4. Handle recurring reservations
      if (reservation.memberSubscriptionId) {
          try {

            console.log("Reservation found: ", reservation.sessionId,reservation.memberSubscriptionId);
              // Try to find parent recurring reservation
              const recurringReservation = await db.query.recurringReservations.findFirst({
                  where: (rr, { eq, and }) => and(
                      eq(rr.memberSubscriptionId, reservation.memberSubscriptionId as number),
                      eq(rr.sessionId, reservation.sessionId),
                      isNull(rr.canceledOn)
                  )
              })
              ;

              console.log("Recurring reservation found: ", recurringReservation);

              if (recurringReservation) {
                  // Create exception for this occurrence
                  await db.insert(recurringReservationsExceptions).values({
                      recurringReservationId: recurringReservation.id,
                      occurrenceDate: reservation.startDate
                  });
                  
                  // Delete the specific reservation instance
                  await db.delete(reservations).where(eq(reservations.id, params.rid));
                  
                  return NextResponse.json({ 
                      message: "Recurring reservation exception created successfully", 
                  }, { status: 200 });
              }
              // If no parent recurring found, fall through to regular deletion
          } catch (err) {
              console.error("Error handling recurring reservation:", err);
              // Fall through to regular deletion if there's an error
          }
      }

      // 5. Handle regular deletion (for non-recurring or when recurring parent not found)
      await db.delete(reservations).where(eq(reservations.id, params.rid));
      
      return NextResponse.json({ 
          message: "Reservation cancelled successfully", 
      }, { status: 200 });

  } catch (err) {
      console.error(err);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}