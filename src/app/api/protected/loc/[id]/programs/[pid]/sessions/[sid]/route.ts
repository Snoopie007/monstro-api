import { db } from "@/db/db";
import { and, eq, gte, isNull } from "drizzle-orm";
import { programSessions, reservations, recurringReservations, reservationExceptions, locations } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";
import type { CancellationResult } from "@/types/reservation";
import { sendSessionCancellationNotifications } from "@/libs/notifications/SessionCancellation";

type props = {
  params: Promise<{ pid: string; sid: string; id: string }>;
};

export async function PATCH(
  req: NextRequest,
  props: props
) {
  // Placeholder for future PATCH implementation
}

/**
 * DELETE /api/protected/loc/[id]/programs/[pid]/sessions/[sid]
 * 
 * Cancel a session with cascading effects:
 * 1. Mark session as cancelled
 * 2. Update all future reservations to cancelled_by_vendor
 * 3. Cancel affected recurring reservations
 * 4. Create exception entries for audit trail
 * 
 * Query params:
 * - notify: boolean - Whether to send notifications to affected members (default: false)
 * - reason: string - Reason for cancellation (optional)
 */
export async function DELETE(req: NextRequest, props: props) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const notify = searchParams.get('notify') === 'true';
  const reason = searchParams.get('reason') || undefined;

  try {
    const result = await db.transaction(async (tx) => {
      // 1. Find the session with program and staff info
      const session = await tx.query.programSessions.findFirst({
        where: and(
          eq(programSessions.id, params.sid),
          eq(programSessions.programId, params.pid)
        ),
        with: {
          program: {
            with: {
              instructor: true,
            },
          },
          staff: true,
        },
      });

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.canceled) {
        throw new Error("Session already canceled");
      }

      const now = new Date();
      const cancellationResult: CancellationResult = {
        cancelledReservations: 0,
        cancelledRecurringReservations: 0,
        exceptionsCreated: 0,
        notificationsSent: 0,
      };

      // 2. Find and update all future reservations for this session
      const futureReservations = await tx.query.reservations.findMany({
        where: and(
          eq(reservations.sessionId, params.sid),
          gte(reservations.startOn, now),
          eq(reservations.status, 'confirmed')
        ),
        with: {
          member: true,
        },
      });

      if (futureReservations.length > 0) {
        // Update reservations to cancelled status
        await tx.update(reservations)
          .set({
            status: 'cancelled_by_vendor',
            cancelledAt: now,
            cancelledReason: reason,
            updated: now,
          })
          .where(and(
            eq(reservations.sessionId, params.sid),
            gte(reservations.startOn, now),
            eq(reservations.status, 'confirmed')
          ));

        cancellationResult.cancelledReservations = futureReservations.length;

        // Create exception entries for each cancelled reservation
        const reservationExceptionEntries = futureReservations.map(r => ({
          reservationId: r.id,
          locationId: params.id,
          sessionId: params.sid,
          occurrenceDate: r.startOn,
          initiator: 'vendor' as const,
          reason: reason,
        }));

        if (reservationExceptionEntries.length > 0) {
          await tx.insert(reservationExceptions).values(reservationExceptionEntries);
          cancellationResult.exceptionsCreated += reservationExceptionEntries.length;
        }
      }

      // 3. Find and cancel all active recurring reservations for this session
      const activeRecurring = await tx.query.recurringReservations.findMany({
        where: and(
          eq(recurringReservations.sessionId, params.sid),
          isNull(recurringReservations.canceledOn),
          eq(recurringReservations.status, 'confirmed')
        ),
        with: {
          member: true,
        },
      });

      if (activeRecurring.length > 0) {
        // Cancel the recurring reservations
        await tx.update(recurringReservations)
          .set({
            canceledOn: now.toISOString().split('T')[0],
            status: 'cancelled_by_vendor',
            updated: now,
          })
          .where(and(
            eq(recurringReservations.sessionId, params.sid),
            isNull(recurringReservations.canceledOn),
            eq(recurringReservations.status, 'confirmed')
          ));

        cancellationResult.cancelledRecurringReservations = activeRecurring.length;

        // Create exception entries for recurring reservations
        const recurringExceptionEntries = activeRecurring.map(r => ({
          recurringReservationId: r.id,
          locationId: params.id,
          sessionId: params.sid,
          occurrenceDate: now,
          initiator: 'vendor' as const,
          reason: reason,
        }));

        if (recurringExceptionEntries.length > 0) {
          await tx.insert(reservationExceptions).values(recurringExceptionEntries);
          cancellationResult.exceptionsCreated += recurringExceptionEntries.length;
        }
      }

      // 4. Mark the session as cancelled
      await tx.update(programSessions)
        .set({ 
          canceled: true,
          updated: now,
        })
        .where(eq(programSessions.id, params.sid));

      // 5. If no reservations existed, we could hard delete instead
      // But we keep the soft delete approach for consistency and audit

      // 6. Send notifications if requested
      if (notify) {
        const allAffectedMembers = [
          ...futureReservations.map(r => r.member),
          ...activeRecurring.map(r => r.member),
        ].filter(Boolean);

        const uniqueMembers = [...new Map(
          allAffectedMembers.map(m => [m.id, m])
        ).values()];

        if (uniqueMembers.length > 0) {
          const location = await tx.query.locations.findFirst({
            where: eq(locations.id, params.id),
          });

          const instructor = session.staff || session.program.instructor;

          const sessionTime = new Date(`1970-01-01T${session.time}`).toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
          });

          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const sessionDate = dayNames[session.day] || 'Scheduled day';

          sendSessionCancellationNotifications(params.id, {
            sessionName: session.program.name,
            sessionDate,
            sessionTime,
            instructorFirstName: instructor?.firstName,
            instructorLastName: instructor?.lastName,
            reason,
            affectedMembers: uniqueMembers.map(m => ({
              memberId: m.id,
              email: m.email,
              firstName: m.firstName,
              lastName: m.lastName ?? undefined,
            })),
            locationName: location?.name || 'Your Studio',
            locationAddress: location?.address ?? undefined,
            locationEmail: location?.email ?? undefined,
            locationPhone: location?.phone ?? undefined,
            makeupBaseUrl: process.env.NEXT_PUBLIC_APP_URL 
              ? `${process.env.NEXT_PUBLIC_APP_URL}/member/makeup`
              : undefined,
          }).catch(err => {
            console.error('Failed to send session cancellation notifications:', err);
          });

          cancellationResult.notificationsSent = uniqueMembers.length;
        }
      }

      return cancellationResult;
    });

    return NextResponse.json({
      success: true,
      ...result,
    }, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to cancel session";
    return NextResponse.json({ error }, { status: 500 });
  }
}