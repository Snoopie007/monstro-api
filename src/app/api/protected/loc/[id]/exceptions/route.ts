import { db } from "@/db/db";
import { and, eq, gte, lte, or, isNull, between } from "drizzle-orm";
import { reservationExceptions, reservations, recurringReservations, locations } from "@subtrees/schemas";
import { NextRequest, NextResponse } from "next/server";
import type { CreateExceptionInput, ExceptionInitiator } from "@subtrees/types/vendor/reservation";
import { sendHolidayCancellationNotifications, type AffectedMember } from "@/libs/notifications/HolidayCancellation";
import { addDays, eachDayOfInterval, isSameDay, getDay } from "date-fns";

type Props = {
  params: Promise<{ id: string }>;
};

export async function GET(req: NextRequest, props: Props) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const initiators = searchParams.getAll('initiator') as ExceptionInitiator[];
  const sessionId = searchParams.get('sessionId');

  try {
    const conditions = [eq(reservationExceptions.locationId, params.id)];

    if (startDate) {
      conditions.push(gte(reservationExceptions.occurrenceDate, new Date(startDate)));
    }

    if (endDate) {
      conditions.push(
        or(
          lte(reservationExceptions.occurrenceDate, new Date(endDate)),
          lte(reservationExceptions.endDate, new Date(endDate))
        )!
      );
    }

    if (initiators.length === 1) {
      conditions.push(eq(reservationExceptions.initiator, initiators[0]));
    } else if (initiators.length > 1) {
      conditions.push(
        or(...initiators.map(i => eq(reservationExceptions.initiator, i)))!
      );
    }

    if (sessionId) {
      conditions.push(eq(reservationExceptions.sessionId, sessionId));
    }

    const exceptions = await db.query.reservationExceptions.findMany({
      where: and(...conditions),
      with: {
        reservation: {
          columns: {
            id: true,
            startOn: true,
            programName: true,
          },
        },
        recurringReservation: {
          columns: {
            id: true,
            startDate: true,
            programName: true,
          },
        },
        session: {
          columns: {
            id: true,
            time: true,
            day: true,
          },
          with: {
            program: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
        createdByStaff: {
          columns: {
            id: true,
          },
          with: {
            user: {
              columns: {
                name: true,
              },
            },
          },
        },
      },
      orderBy: (e, { desc }) => [desc(e.occurrenceDate)],
    });

    return NextResponse.json(exceptions, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to fetch exceptions";
    return NextResponse.json({ error }, { status: 500 });
  }
}

export async function POST(req: NextRequest, props: Props) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const notify = searchParams.get('notify') === 'true';
  
  const body: CreateExceptionInput = await req.json();

  const {
    reservationId,
    recurringReservationId,
    sessionId,
    occurrenceDate,
    endDate,
    initiator,
    reason,
    createdBy,
  } = body;

  if (!occurrenceDate) {
    return NextResponse.json(
      { error: "occurrenceDate is required" },
      { status: 400 }
    );
  }

  if (!initiator) {
    return NextResponse.json(
      { error: "initiator is required" },
      { status: 400 }
    );
  }

  try {
    const isClosureType = initiator === 'holiday' || initiator === 'maintenance';
    const startDateObj = new Date(occurrenceDate);
    const endDateObj = endDate ? new Date(endDate) : startDateObj;
    
    const result = await db.transaction(async (tx) => {
      const [exception] = await tx
        .insert(reservationExceptions)
        .values({
          reservationId,
          recurringReservationId,
          locationId: params.id,
          sessionId,
          occurrenceDate: startDateObj,
          endDate: endDate ? endDateObj : undefined,
          initiator,
          reason,
          createdBy,
        })
        .returning();

      const cancellationStats = {
        cancelledReservations: 0,
        recurringExceptionsCreated: 0,
        affectedMembers: [] as AffectedMember[],
      };

      if (!isClosureType) {
        return { exception, stats: cancellationStats };
      }

      const now = new Date();
      const closureDates = eachDayOfInterval({ start: startDateObj, end: endDateObj });

      const futureReservations = await tx.query.reservations.findMany({
        where: and(
          eq(reservations.locationId, params.id),
          eq(reservations.status, 'confirmed'),
          gte(reservations.startOn, now),
          or(
            ...closureDates.map(date => {
              const dayStart = new Date(date);
              dayStart.setHours(0, 0, 0, 0);
              const dayEnd = new Date(date);
              dayEnd.setHours(23, 59, 59, 999);
              return and(
                gte(reservations.startOn, dayStart),
                lte(reservations.startOn, dayEnd)
              );
            })
          )
        ),
        with: {
          member: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      if (futureReservations.length > 0) {
        const reservationIds = futureReservations.map(r => r.id);
        
        await tx.update(reservations)
          .set({
            status: 'cancelled_by_holiday',
            cancelledAt: now,
            cancelledReason: reason || `Cancelled due to ${initiator}`,
            updated: now,
          })
          .where(
            and(
              eq(reservations.locationId, params.id),
              or(...reservationIds.map(id => eq(reservations.id, id)))
            )
          );

        cancellationStats.cancelledReservations = futureReservations.length;

        const reservationExceptionEntries = futureReservations.map(r => ({
          reservationId: r.id,
          locationId: params.id,
          sessionId: r.sessionId,
          occurrenceDate: r.startOn,
          initiator: initiator,
          reason: reason || `Cancelled due to ${initiator}`,
        }));

        if (reservationExceptionEntries.length > 0) {
          await tx.insert(reservationExceptions).values(reservationExceptionEntries);
        }
      }

      const activeRecurring = await tx.query.recurringReservations.findMany({
        where: and(
          eq(recurringReservations.locationId, params.id),
          eq(recurringReservations.status, 'confirmed'),
          isNull(recurringReservations.canceledOn)
        ),
        with: {
          member: {
            columns: {
              id: true,
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      });

      const recurringExceptionEntries: Array<{
        recurringReservationId: string;
        locationId: string;
        sessionId: string | null;
        occurrenceDate: Date;
        initiator: typeof initiator;
        reason: string | undefined;
      }> = [];

      for (const recurring of activeRecurring) {
        const recurringDay = recurring.sessionDay;
        if (recurringDay === null || recurringDay === undefined) continue;

        for (const closureDate of closureDates) {
          const closureDayOfWeek = getDay(closureDate);
          
          if (closureDayOfWeek === recurringDay) {
            recurringExceptionEntries.push({
              recurringReservationId: recurring.id,
              locationId: params.id,
              sessionId: recurring.sessionId,
              occurrenceDate: closureDate,
              initiator: initiator,
              reason: reason || `Cancelled due to ${initiator}`,
            });

            const existingMember = cancellationStats.affectedMembers.find(
              m => m.memberId === recurring.member.id
            );

            if (existingMember) {
              existingMember.reservations.push({
                id: recurring.id,
                className: recurring.programName || 'Class',
                originalTime: closureDate.toISOString(),
              });
            } else if (recurring.member.email) {
              cancellationStats.affectedMembers.push({
                memberId: recurring.member.id,
                email: recurring.member.email,
                firstName: recurring.member.firstName,
                lastName: recurring.member.lastName ?? undefined,
                reservations: [{
                  id: recurring.id,
                  className: recurring.programName || 'Class',
                  originalTime: closureDate.toISOString(),
                }],
              });
            }
          }
        }
      }

      if (recurringExceptionEntries.length > 0) {
        await tx.insert(reservationExceptions).values(recurringExceptionEntries);
        cancellationStats.recurringExceptionsCreated = recurringExceptionEntries.length;
      }

      for (const reservation of futureReservations) {
        if (!reservation.member.email) continue;

        const existingMember = cancellationStats.affectedMembers.find(
          m => m.memberId === reservation.member.id
        );

        if (existingMember) {
          existingMember.reservations.push({
            id: reservation.id,
            className: reservation.programName || 'Class',
            originalTime: reservation.startOn.toISOString(),
          });
        } else {
          cancellationStats.affectedMembers.push({
            memberId: reservation.member.id,
            email: reservation.member.email,
            firstName: reservation.member.firstName,
            lastName: reservation.member.lastName ?? undefined,
            reservations: [{
              id: reservation.id,
              className: reservation.programName || 'Class',
              originalTime: reservation.startOn.toISOString(),
            }],
          });
        }
      }

      return { exception, stats: cancellationStats };
    });

    let notificationResult = null;
    
    if (notify && isClosureType && result.stats.affectedMembers.length > 0) {
      try {
        const location = await db.query.locations.findFirst({
          where: eq(locations.id, params.id),
          columns: {
            name: true,
            address: true,
            email: true,
            phone: true,
          },
        });

        if (location) {
          notificationResult = await sendHolidayCancellationNotifications(
            params.id,
            {
              holidayName: reason || (initiator === 'holiday' ? 'Holiday Closure' : 'Maintenance Closure'),
              holidayDate: startDateObj.toISOString().split('T')[0],
              affectedMembers: result.stats.affectedMembers,
              locationName: location.name,
              locationAddress: location.address ?? undefined,
              locationEmail: location.email ?? undefined,
              locationPhone: location.phone ?? undefined,
            }
          );
        }
      } catch (notifyErr) {
        console.error('Failed to send notifications:', notifyErr);
      }
    }

    return NextResponse.json({
      exception: result.exception,
      cancellationStats: isClosureType ? {
        cancelledReservations: result.stats.cancelledReservations,
        recurringExceptionsCreated: result.stats.recurringExceptionsCreated,
        affectedMembersCount: result.stats.affectedMembers.length,
      } : undefined,
      notificationResult,
    }, { status: 201 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to create exception";
    return NextResponse.json({ error }, { status: 500 });
  }
}
