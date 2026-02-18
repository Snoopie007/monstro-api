import { db } from "@/db/db";
import { getEventColorFromId } from "@/libs/program-colors";
import { CalendarEvent } from "@/types/calendar";
import { addDays, addMinutes, endOfMonth, startOfMonth } from "date-fns";
import { toDate } from "date-fns-tz";
import { NextRequest, NextResponse } from "next/server";

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

  const startDate = startDateParam
    ? new Date(startDateParam)
    : startOfMonth(new Date(searchParams.get("date") || new Date()));
  const endDate = endDateParam ? new Date(endDateParam) : endOfMonth(startDate);

  const planIds = planIdsParam ? planIdsParam.split(",") : null;

  try {
    const events: CalendarEvent[] = [];

    const [locationPrograms, reservations] = await Promise.all([
      db.query.programs.findMany({
        where: (p, { eq }) => eq(p.locationId, params.id),
        columns: { id: true },
      }),
      db.query.reservations.findMany({
        where: (r, { between, and, eq, or, isNull }) =>
          and(
            between(r.startOn, startDate, endDate),
            eq(r.locationId, params.id),
            or(eq(r.status, "confirmed"), isNull(r.status))
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
    ]);

    const programIds = locationPrograms.map((p) => p.id);

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

    const reservationsBySessionAndDate = new Map<string, boolean>();
    reservations.forEach((reservation) => {
      if (reservation.sessionId) {
        const key = `${reservation.sessionId}-${new Date(
          reservation.startOn
        ).toDateString()}`;
        reservationsBySessionAndDate.set(key, true);
      }
    });

    locationSessions.forEach((session) => {
      if (!session.program) return;
      let currentDate = toDate(startDate, { timeZone: "UTC" });
      const sessionDay = session.day;
      const currentDay = currentDate.getDay();

      if (currentDay !== sessionDay) {
        currentDate = addDays(currentDate, (sessionDay - currentDay + 7) % 7);
      }

      while (currentDate <= endDate) {
        const parsedSessionStartDate = `${
          currentDate.toISOString().split("T")[0]
        }T${session.time}`;
        const endTime = addMinutes(
          parsedSessionStartDate,
          session.duration
        ).getHours();
        const endMinutes = addMinutes(
          parsedSessionStartDate,
          session.duration
        ).getMinutes();
        const parsedSessionEndDate = `${
          currentDate.toISOString().split("T")[0]
        }T${endTime}:${endMinutes}`;
        const start = toDate(parsedSessionStartDate, { timeZone: timezone });
        const end = toDate(parsedSessionEndDate, { timeZone: timezone });
        const id = `${start.toISOString()}-${session.id}`;

        const reservationKey = `${session.id}-${currentDate.toDateString()}`;
        const hasReservation = reservationsBySessionAndDate.has(reservationKey);

        if (!hasReservation) {
          const programColor =
            (session.program as { color?: number } | undefined)?.color ?? 1;
          events.push({
            id,
            title: session.program.name,
            color: getEventColorFromId(programColor),
            start,
            end,
            duration: session.duration,
            data: {
              sessionId: session.id,
              memberPlanId: session.program.planPrograms.map((plan) => plan.planId),
              programId: session.program.id,
              reservationId: undefined,
              members: [],
              memberReservations: [],
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

    reservations.forEach((reservation) => {
      addEventToCalendar(events, reservation);
    });

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
function addEventToCalendar(events: CalendarEvent[], reservation: any) {
  const programName = reservation.programName || reservation.session?.program?.name;
  const programId = reservation.programId || reservation.session?.programId;
  const sessionId = reservation.sessionId || reservation.session?.id;
  const duration = reservation.sessionDuration || reservation.session?.duration || 0;
  const staffId = reservation.staffId || reservation.session?.staffId;
  const staff = reservation.staff || reservation.session?.staff;
  const programColor =
    (reservation.program as { color?: number } | undefined)?.color ||
    (reservation.session?.program as { color?: number } | undefined)?.color;

  if (!reservation.member || (!programName && !reservation.session?.program)) {
    return;
  }

  const start = new Date(reservation.startOn);
  const end = new Date(reservation.endOn);
  const id = sessionId
    ? `${start.toISOString()}-${sessionId}`
    : `${start.toISOString()}-${reservation.id}`;

  const member = {
    memberId: reservation.member.id,
    name: `${reservation.member.firstName} ${reservation.member.lastName}`,
    avatar: reservation.member.avatar,
  };

  const existingIndex = events.findIndex(
    (event) =>
      event.id === id ||
      (event.data?.sessionId === sessionId &&
        event.start.toISOString() === start.toISOString())
  );

  if (existingIndex >= 0) {
    const event = events[existingIndex];
    if (!event.data) return;

    const memberExists = (event.data.members || []).some(
      (m) => String(m.memberId) === String(member.memberId)
    );
    if (!memberExists) {
      event.data.members = [...(event.data.members || []), member];
    }

    const currentMemberReservations = event.data.memberReservations || [];
    const memberReservationExists = currentMemberReservations.some(
      (entry) =>
        String(entry.memberId) === String(reservation.member.id) &&
        String(entry.reservationId) === String(reservation.id)
    );
    if (!memberReservationExists) {
      event.data.memberReservations = [
        ...currentMemberReservations,
        { memberId: reservation.member.id, reservationId: reservation.id },
      ];
    }

    if (!event.data.reservationId) {
      event.data.reservationId = reservation.id || undefined;
    }

    const memberPlanId =
      reservation.memberPackageId || reservation.memberSubscriptionId || "";
    if (memberPlanId) {
      const existingPlanIds = event.data.memberPlanId || [];
      if (!existingPlanIds.includes(memberPlanId)) {
        event.data.memberPlanId = [...existingPlanIds, memberPlanId];
      }
    }
  } else {
    events.push({
      id,
      title: programName || "Unknown Program",
      color: getEventColorFromId(programColor),
      start,
      end,
      duration,
      data: {
        sessionId: sessionId || "",
        memberPlanId: [
          reservation.memberPackageId || reservation.memberSubscriptionId || "",
        ],
        programId: programId || "",
        reservationId: reservation.id || undefined,
        memberReservations: [
          { memberId: reservation.member.id, reservationId: reservation.id },
        ],
        members: [member],
        isMakeUpClass: reservation.isMakeUpClass || false,
      },
      staff: staff
        ? {
            id: staffId || "",
            name: (staff.firstName || "") + " " + (staff.lastName || ""),
            avatar: staff.user?.image,
          }
        : {
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
  const eventMap = new Map<string, CalendarEvent>();

  events.forEach((event) => {
    const eventDate = new Date(event.start);
    if (eventDate < startDate || eventDate > endDate) return;

    const existingEvent = eventMap.get(event.id);
    if (existingEvent) {
      if (event.data?.members?.length) {
        if (!existingEvent.data) {
          existingEvent.data = {
            programId: event.data.programId,
            sessionId: event.data.sessionId,
            members: [],
            memberReservations: [],
          };
        }

        existingEvent.data.members = [
          ...(existingEvent.data.members || []),
          ...event.data.members,
        ];
      }

      if (existingEvent.data) {
        if (event.data?.reservationId) {
          existingEvent.data.reservationId = event.data.reservationId;
        }
        if (event.data?.memberPlanId) {
          existingEvent.data.memberPlanId = event.data.memberPlanId;
        }
        if (event.data?.memberReservations?.length) {
          const merged = [...(existingEvent.data.memberReservations || [])];
          event.data.memberReservations.forEach((entry) => {
            const exists = merged.some(
              (m) =>
                String(m.memberId) === String(entry.memberId) &&
                String(m.reservationId) === String(entry.reservationId)
            );
            if (!exists) merged.push(entry);
          });
          existingEvent.data.memberReservations = merged;
        }
      }
    } else {
      eventMap.set(event.id, { ...event });
    }
  });

  return Array.from(eventMap.values());
}
