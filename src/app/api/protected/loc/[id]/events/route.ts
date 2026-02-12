import { db } from "@/db/db";
import { CalendarEvent } from "@subtrees/types/vendor/calendar";
import { RecurringReservationWithRelations } from "@subtrees/types/vendor/reservation";
import { endOfMonth, startOfMonth, addDays, addMinutes } from "date-fns";
import { toDate,  } from 'date-fns-tz'
import { NextResponse, NextRequest } from "next/server";
import { getEventColorFromId } from "@/libs/program-colors";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const { searchParams } = new URL(req.url);
  const params = await props.params;
  const startDateParam = searchParams.get("startDate");
  const endDateParam = searchParams.get("endDate");
  const planIdsParam = searchParams.get("planIds");
  const timezone = req.headers.get("X-Timezone") || "America/Los_Angeles";

  // If startDate and endDate are provided, use them directly
  // Otherwise, fallback to month boundaries for backward compatibility
  const startDate = startDateParam
    ? new Date(startDateParam)
    : startOfMonth(new Date(searchParams.get("date") || new Date()));
  const endDate = endDateParam ? new Date(endDateParam) : endOfMonth(startDate);

  const planIds = planIdsParam ? planIdsParam.split(",") : null;

  try {
    const events: CalendarEvent[] = [];

    // Parallelize independent queries for better performance
    const [locationPrograms, reservations, recurrings] = await Promise.all([
      // Get all programs for this location
      db.query.programs.findMany({
        where: (p, { eq }) => eq(p.locationId, params.id),
        columns: {
          id: true,
        },
      }),
      // Get standard reservations - uses denormalized data to reduce joins
      db.query.reservations.findMany({
        where: (r, { between, and, eq, or, isNull }) =>
          and(
            between(r.startOn, startDate, endDate),
            eq(r.locationId, params.id),
            // Only include confirmed reservations (or null status for pre-migration data)
            or(eq(r.status, 'confirmed'), isNull(r.status))
          ),
        with: {
          member: true,
          memberPackage: true,
          program: true,
          staff: {
            with: {
              user: true,
            },
          },
        },
      }),
      // Get recurring reservations - uses denormalized data when available
      db.query.recurringReservations.findMany({
        where: (r, { and, eq, gte, or, isNull, lte }) =>
          and(
            lte(r.startDate, startDate),
            eq(r.locationId, params.id),
            or(isNull(r.canceledOn), gte(r.canceledOn, startDate.toISOString())),
            // Only include confirmed reservations (or null status for pre-migration data)
            or(eq(r.status, 'confirmed'), isNull(r.status))
          ),
        with: {
          member: true,
          memberPackage: true,
          session: {
            with: {
              program: true,
              staff: {
                with: {
                  user: true,
                },
              },
            },
          },
          program: true,
          staff: {
            with: {
              user: true,
            },
          },
          exceptions: true,
        },
      }) as Promise<RecurringReservationWithRelations[]>,
    ]);

    const programIds = locationPrograms.map((p) => p.id);

    // Fetch sessions after we have programIds (depends on previous query)
    const locationSessions = await db.query.programSessions.findMany({
      where: (s, { inArray }) => inArray(s.programId, programIds),
      with: {
        program: {
          with: {
            planPrograms: true,
          },
        },
        staff: {
          with: {
            user: {
              columns: {
                image: true,
              },
            },
          },
        },
      },
    });

    // Build lookup maps for O(1) reservation checks instead of O(n²) .some() calls
    const reservationsBySessionAndDate = new Map<string, boolean>();
    reservations.forEach(r => {
      if (r.sessionId) {
        const key = `${r.sessionId}-${new Date(r.startOn).toDateString()}`;
        reservationsBySessionAndDate.set(key, true);
      }
    });

    const recurringsBySessionDay = new Map<string, number[]>();
    recurrings.forEach(r => {
      if (r.sessionId && r.session?.day !== undefined) {
        const existing = recurringsBySessionDay.get(r.sessionId) || [];
        existing.push(r.session.day);
        recurringsBySessionDay.set(r.sessionId, existing);
      }
    });

    // Generate available session slots
    locationSessions.forEach((session) => {
      if (!session.program) return;
      let currentDate = toDate(startDate, {timeZone: "UTC"});
      const sessionDay = session.day;
      const currentDay = currentDate.getDay();

      if (currentDay !== sessionDay) {
        currentDate = addDays(currentDate, (sessionDay - currentDay + 7) % 7);
      }

      while (currentDate <= endDate) {
        const parsedSessionStartDate = `${currentDate.toISOString().split("T")[0]}T${session.time}`;
        const endTime = addMinutes(parsedSessionStartDate, session.duration).getHours();
        const endMinutes = addMinutes(parsedSessionStartDate, session.duration).getMinutes();
        const parsedSessionEndDate = `${currentDate.toISOString().split("T")[0]}T${endTime}:${endMinutes}`;
        const start = toDate(parsedSessionStartDate, { timeZone: timezone });
        
        const end = toDate(parsedSessionEndDate, { timeZone: timezone });
        const id = `${start.toISOString()}-${session.id}`;
      
        // O(1) lookup using pre-built Maps instead of O(n) .some() calls
        const reservationKey = `${session.id}-${currentDate.toDateString()}`;
        const hasReservation =
          reservationsBySessionAndDate.has(reservationKey) ||
          recurringsBySessionDay.get(session.id)?.includes(session.day) === true;

        if (!hasReservation) {
          const programColor = (session.program as { color?: number } | undefined)?.color ?? 1;
          events.push({
            id,
            title: session.program.name,
            color: getEventColorFromId(programColor),
            start,
            end,
            duration: session.duration,
            data: {
              sessionId: session.id,
              memberPlanId: session.program.planPrograms.map(
                (plan) => plan.planId
              ),
              programId: session.program.id,
              members: [],
              isRecurring: false,
            },
            staff: {
              id: session.staffId || "",
              name: session.staff?.firstName + " " + session.staff?.lastName,
              avatar: session.staff?.user?.image,
            },
          });
        }

        currentDate = addDays(currentDate, 7);
      }
    });
    // Process recurring reservations
    recurrings.forEach((recurring) => {
      if (!recurring.session || !recurring.member) return;

      let currentDate = new Date(startDate);
      const sessionDay = recurring.session.day;
      const currentDay = currentDate.getDay();

      if (currentDay !== sessionDay) {
        currentDate = addDays(currentDate, (sessionDay - currentDay + 7) % 7);
      }

      while (currentDate <= endDate) {
        const exception = recurring.exceptions?.find(
          (e) =>
            new Date(e.occurrenceDate).toDateString() ===
            currentDate.toDateString()
        );

        if (!exception) {
          const { id, intervalThreshold, interval, exceptions, ...rest } =
            recurring;
          const vr = {
            ...rest,
            startOn: currentDate,
            id: recurring.id,
            endOn: new Date(
              currentDate.getTime() + (recurring.session?.duration || 0) * 60000
            ),
            cancelledAt: null,
            cancelledReason: null,
            isMakeUpClass: false,
            originalReservationId: null,
          };
          addEventToCalendar(events, vr, recurring.id);
        }
        currentDate = addDays(
          currentDate,
          (recurring.intervalThreshold || 1) * 7
        );
      }
    });

    // Process standard reservations
    reservations.forEach((reservation) => {
      addEventToCalendar(events, reservation);
    });
    // Merge duplicates and filter by date range
    let finalEvents = mergeAndFilterEvents(events, startDate, endDate);
    if (planIds && planIds.length > 0) {
      finalEvents = finalEvents.filter((event) => {
        if (event.data?.memberPlanId) {
          return event.data.memberPlanId.some((planId) =>
            planIds.includes(planId)
          );
        }
        return false;
      });
    }

    return NextResponse.json(finalEvents, { status: 200 });
  } catch (err) {
    console.error("Error fetching calendar events:", err);
    return NextResponse.json(
      { error: "Failed to fetch calendar events" },
      { status: 500 }
    );
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function addEventToCalendar(
  events: CalendarEvent[],
  reservation: any,
  recurringId?: string
) {
  const programName = reservation.programName || reservation.session?.program?.name;
  const programId = reservation.programId || reservation.session?.programId;
  const sessionId = reservation.sessionId || reservation.session?.id;
  const duration = reservation.sessionDuration || reservation.session?.duration || 0;
  const staffId = reservation.staffId || reservation.session?.staffId;
  const staff = reservation.staff || reservation.session?.staff;
  const programColor = (reservation.program as { color?: number } | undefined)?.color || (reservation.session?.program as { color?: number } | undefined)?.color;

  if (!reservation.member || (!programName && !reservation.session?.program)) {
    return;
  }

  const start = new Date(reservation.startOn);
  const end = new Date(reservation.endOn);

  const id = sessionId ? `${start.toISOString()}-${sessionId}` : `${start.toISOString()}-${reservation.id}`;
  const member = {
    memberId: reservation.member.id,
    name: `${reservation.member.firstName} ${reservation.member.lastName}`,
    avatar: reservation.member.avatar,
  };

  const existingIndex = events.findIndex(
    (e) =>
      e.id === id ||
      (e.data?.sessionId === sessionId &&
        e.start.toISOString() === start.toISOString())
  );

  if (existingIndex >= 0) {
    const event = events[existingIndex];
    if (event.data) {
      event.data.members = [...(event.data.members || []), member];
      event.data.reservationId = reservation.id || undefined;
      event.data.recurringId = recurringId;
      event.data.isRecurring = !!recurringId;
      event.data.memberPlanId = [
        reservation.memberPackageId ||
          reservation.memberSubscriptionId ||
          "",
      ];
    }
  } else {
    events.push({
      id,
      title: programName || 'Unknown Program',
      color: getEventColorFromId(programColor),
      start,
      end,
      duration,
      data: {
        sessionId: sessionId || '',
        memberPlanId: [
          reservation.memberPackageId ||
            reservation.memberSubscriptionId ||
            "",
        ],
        programId: programId || '',
        reservationId: reservation.id || undefined,
        recurringId,
        members: [member],
        isRecurring: !!recurringId,
        isMakeUpClass: reservation.isMakeUpClass || false,
      },
      staff: staff ? {
        id: staffId || "",
        name: (staff.firstName || '') + " " + (staff.lastName || ''),
        avatar: staff.user?.image,
      } : {
        id: "",
        name: "Unassigned",
        avatar: null,
      },
    });
  }
}

function mergeAndFilterEvents(
  events: CalendarEvent[],
  startDate: Date,
  endDate: Date
): CalendarEvent[] {
  const mergedEvents: CalendarEvent[] = [];
  const eventMap = new Map<string, CalendarEvent>();

  events.forEach((event) => {
    // Filter out events outside our date range
    const eventDate = new Date(event.start);
    if (eventDate < startDate || eventDate > endDate) return;

    const existingEvent = eventMap.get(event.id);

    if (existingEvent) {
      // Merge members if they exist in the new event
      if (event.data?.members?.length) {
        if (!existingEvent.data) {
          existingEvent.data = {
            programId: event.data.programId,
            sessionId: event.data.sessionId,
            members: [],
            isRecurring: false,
          };
        }
        existingEvent.data.members = [
          ...(existingEvent.data.members || []),
          ...event.data.members,
        ];
      }
      
      // Update reservation data if present in new event
      if (existingEvent.data) {
        if (event.data?.reservationId) {
          existingEvent.data.reservationId = event.data.reservationId;
        }
        if (event.data?.recurringId) {
          existingEvent.data.recurringId = event.data.recurringId;
        }
        if (event.data?.memberPlanId) {
          existingEvent.data.memberPlanId = event.data.memberPlanId;
        }
        existingEvent.data.isRecurring = !!existingEvent.data.recurringId;
      }
    } else {
      eventMap.set(event.id, { ...event });
    }
  });

  return Array.from(eventMap.values());
}
