import { db } from "@/db/db";
import { CalendarEvent } from "@/types/calendar";
import { RecurringReservation, Reservation } from "@/types";
import { endOfMonth, startOfMonth, addDays, addMinutes } from "date-fns";
import { toDate,  } from 'date-fns-tz'
import { NextResponse, NextRequest } from "next/server";

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

    // First, get all programs for this location
    const locationPrograms = await db.query.programs.findMany({
      where: (p, { eq }) => eq(p.locationId, params.id),
      columns: {
        id: true,
      },
    });

    const programIds = locationPrograms.map((p) => p.id);

    // Then get all sessions for these programs
    const locationSessions = await db.query.programSessions.findMany({
      where: (s, { inArray }) => inArray(s.programId, programIds),
      with: {
        program: {
          with: {
            planPrograms: true,
          },
        },
        staff: true
      },
    });

    // Get standard reservations - now uses denormalized data to reduce joins
    // Only fetch confirmed reservations (exclude cancelled ones)
    const reservations = await db.query.reservations.findMany({
      where: (r, { between, and, eq }) =>
        and(
          between(r.startOn, startDate, endDate),
          eq(r.locationId, params.id),
          eq(r.status, 'confirmed')
        ),
      with: {
        member: true,
        // Still include session for backward compatibility during migration
        // but we'll prefer denormalized data when available
        session: {
          with: {
            program: true,
          },
        },
        memberPackage: true,
        staff: true, // Now available directly from reservation
      },
    });

    // Get recurring reservations - uses denormalized data
    // Only fetch confirmed recurring reservations
    const recurrings = await db.query.recurringReservations.findMany({
      where: (r, { and, eq, gte, or, isNull, lte }) =>
        and(
          lte(r.startDate, startDate),
          eq(r.locationId, params.id),
          or(isNull(r.canceledOn), gte(r.canceledOn, startDate.toISOString())),
          eq(r.status, 'confirmed')
        ),
      with: {
        member: true,
        memberPackage: true,
        // Still include session for backward compatibility
        session: {
          with: {
            program: true,
            staff: true,
          },
        },
        staff: true, // Now available directly from recurring reservation
        // Use new unified exceptions table
        exceptions: true,
        legacyExceptions: true, // Keep for backward compatibility during migration
      },
    }) as RecurringReservation[];

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
      
        // Check if this session already has a reservation
        const hasReservation =
          reservations.some(
            (r) =>
              r.sessionId === session.id &&
              new Date(r.startOn).toDateString() === currentDate.toDateString()
          ) ||
          recurrings.some(
            (r) => r.sessionId === session.id && r.session?.day === session.day
          );

        if (!hasReservation) {
          events.push({
            id,
            title: session.program.name,
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
              avatar: session.staff?.avatar,
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
          const vr: Reservation = {
            ...rest,
            startOn: currentDate,
            id: recurring.id,
            endOn: new Date(
              currentDate.getTime() + (recurring.session?.duration || 0) * 60000
            ),
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
    // Apply plan filtering if planIds are provided
    if (planIds && planIds.length > 0) {
      finalEvents = finalEvents.filter((event) => {
        // If the event has a memberPlanId, check if it's in the filter
        if (event.data?.memberPlanId) {
          return event.data.memberPlanId.some((planId) =>
            planIds.includes(planId)
          );
        }
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

function addEventToCalendar(
  events: CalendarEvent[],
  reservation: Reservation,
  recurringId?: string
) {
  // Use denormalized data when available, fall back to session data for backward compatibility
  const programName = reservation.programName || reservation.session?.program?.name;
  const programId = reservation.programId || reservation.session?.programId;
  const sessionId = reservation.sessionId || reservation.session?.id;
  const duration = reservation.sessionDuration || reservation.session?.duration || 0;
  const staffId = reservation.staffId || reservation.session?.staffId;
  const staff = reservation.staff || reservation.session?.staff;

  // Skip if we don't have required data
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
    // Merge with existing event
    const event = events[existingIndex];
    if (event.data) {
      event.data.members = [...(event.data.members || []), member];
      event.data.reservationId = reservation.id || undefined;
      event.data.recurringId = recurringId;
      event.data.isRecurring = !!recurringId;
      event.data.memberPlanId = [
        reservation.memberPackage?.memberPlanId ||
          reservation.memberPackage?.id ||
          "",
      ];
    }
  } else {
    // Create new event using denormalized data when available
    events.push({
      id,
      title: programName || 'Unknown Program',
      start,
      end,
      duration,
      data: {
        sessionId: sessionId || '',
        memberPlanId: [
          reservation.memberPackage?.memberPlanId ||
            reservation.memberPackageId ||
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
        avatar: staff.avatar,
      } : undefined,
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
