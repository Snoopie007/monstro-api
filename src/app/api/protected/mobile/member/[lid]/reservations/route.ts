import {NextRequest, NextResponse} from "next/server";
import {db} from "@/db/db";
import {and, eq, isNull} from "drizzle-orm";
import {authenticateMember} from "@/libs/utils";
import {
  recurringReservations,
  recurringReservationsExceptions,
  reservations,
} from "@/db/schemas";
import {getSessionState, isSessionPasted} from "@/libs/server/db";
import {MemberSubscription, Reservation} from "@/types";
import {addDays} from "date-fns";

type MemberReservationProps = {
  params: Promise<{id: number}>;
};
type Params = {
  lid: number;
};

export async function GET(
  request: NextRequest,
  props: {params: Promise<{lid: number}>}
) {
  const {searchParams} = new URL(request.url);
  const sessionIds = searchParams.get("sessionIds");
  const date = searchParams.get("date");
  console.log("Session IDs:", sessionIds, "Date:", date);

  const params = await props.params;

  try {
    const authMember = authenticateMember(request);
    if (!authMember || !authMember.member) {
      return NextResponse.json({error: "Unauthorized"}, {status: 401});
    }

    const locationId = Number(params.lid);
    if (isNaN(locationId)) {
      return NextResponse.json({error: "Invalid location ID"}, {status: 400});
    }

    if (!date) {
      return NextResponse.json({error: "Date is required"}, {status: 400});
    }

    if (!sessionIds) {
      return NextResponse.json(
        {error: "Session IDs are required"},
        {status: 400}
      );
    }

    //console.log("Resolved IDs => memberId:", authMember.member.id, "locationId:", locationId);

    // Parse session IDs if provided
    const ids = sessionIds.split(",").map((id) => parseInt(id));

    const startDate = new Date(date).toISOString();
    const endDate = addDays(startDate, 6);

    const reservations = await db.query.reservations.findMany({
      where: (reservations, {and, between, inArray}) =>
        and(
          inArray(reservations.sessionId, ids),
          between(reservations.startOn, startDate, endDate.toISOString()),
          isNull(reservations.endOn)
        ),
    });

    // Get member's active subscription
    const subscription = await db.query.memberSubscriptions.findFirst({
      where: (s, {and, eq}) =>
        and(
          eq(s.memberId, Number(authMember.member.id)),
          eq(s.locationId, locationId),
          eq(s.status, "active")
        ),
    });

    if (!subscription) {
      return NextResponse.json(
        {error: "No active subscription found"},
        {status: 404}
      );
    }

    // Get recurring reservations
    const recurrings = await db.query.recurringReservations.findMany({
      where: (rr, {and, gte, or, isNull, lte, inArray}) =>
        and(
          inArray(rr.sessionId, ids),
          lte(rr.startDate, startDate),
          or(isNull(rr.canceledOn), gte(rr.canceledOn, startDate))
        ),
      with: {
        exceptions: {
          columns: {
            recurringReservationId: true,
            occurrenceDate: true,
          },
        },
        session: true,
      },
    });

    // Generate recurring reservation instances
    let recurringReservations: Reservation[] = [];
    recurrings.forEach((rr) => {
      let currentDate = new Date(startDate);
      const sessionDay = rr.session?.day;
      const currentDay = currentDate.getDay();

      if (currentDay !== sessionDay) {
        currentDate = addDays(currentDate, (sessionDay - currentDay + 7) % 7);
      }

      while (currentDate <= endDate) {
        const currentDateString = currentDate.toISOString().split("T")[0];
        const exception = rr.exceptions?.find(
          (e) => e.occurrenceDate === currentDateString
        );
        const existingReservation = reservations.find((r) => {
          return (
            r.startOn === currentDateString && r.sessionId === rr.sessionId
          );
        });

        if (exception || existingReservation) {
          currentDate = addDays(currentDate, (rr.intervalThreshold || 1) * 7);
          continue;
        }

        const {id, intervalThreshold, interval, exceptions, session, ...rest} =
          rr;
        recurringReservations.push({
          ...rest,
          recurringId: rr.id,
          isRecurring: true,
          startOn: currentDateString,
        });
        currentDate = addDays(currentDate, (rr.intervalThreshold || 1) * 7);
      }
    });

    const sortedReservations = [...reservations, ...recurringReservations];

    return NextResponse.json(sortedReservations, {status: 200});
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : String(error),
      },
      {status: 500}
    );
  }
}

export async function POST(req: NextRequest, props: {params: Promise<Params>}) {
  const {startDate, sessionId, memberPlanId, ...rest} = await req.json();
  const {lid} = await props.params;
  const authMember = authenticateMember(req);
  const mid = Number(authMember.member.id);

  console.log(startDate, sessionId, rest);

  try {
    // 1. Validate member's active subscription
    const memberSub: MemberSubscription | undefined =
      await db.query.memberSubscriptions.findFirst({
        where: (s, {eq, and}) =>
          and(
            eq(s.id, memberPlanId),
            eq(s.memberId, mid),
            eq(s.locationId, lid),
            eq(s.status, "active")
          ),
        with: {
          plan: true,
        },
      });

    const memberPkg = await db.query.memberPackages.findFirst({
      where: (s, {eq, and}) =>
        and(
          eq(s.id, memberPlanId),
          eq(s.memberId, mid),
          eq(s.locationId, lid),
          eq(s.status, "active")
        ),
      with: {
        plan: true,
      },
    });

    if (!memberSub && !memberPkg) {
      return NextResponse.json(
        {error: "No active subscription found"},
        {status: 404}
      );
    }

    // 2. Check if session exists with additional data
    const session = await db.query.programSessions.findFirst({
      where: (s, {eq}) => eq(s.id, sessionId),
      with: {
        program: true,
        reservations: {
          where: (r, {eq}) => eq(r.startOn, startDate.split("T")[0]),
        },
        recurringReservations: {
          where: (rr, {lte, isNull, and}) =>
            and(
              lte(rr.startDate, startDate.split("T")[0]),
              isNull(rr.canceledOn)
            ),
          with: {
            exceptions: {
              where: (exceptions, {eq}) =>
                eq(exceptions.occurrenceDate, startDate.split("T")[0]),
            },
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({error: "Session not found"}, {status: 404});
    }

    const exception = await db.query.recurringReservationsExceptions.findFirst({
      where: (e, {eq}) => eq(e.occurrenceDate, startDate.split("T")[0]),
    });

    if (exception) {
      let reservation;
      const exceptionDate = await db
        .delete(recurringReservationsExceptions)
        .where(
          eq(
            recurringReservationsExceptions.occurrenceDate,
            startDate.split("T")[0]
          )
        )
        .returning();
      reservation = {
        id: exceptionDate[0].recurringReservationId,
        occurrenceDate: exceptionDate[0].occurrenceDate,
      };

      return NextResponse.json(
        {
          message: `Reservation created successfully for this ${startDate} `,
          reservation,
        },
        {status: 200}
      );
    }

    // 3. Check if session is in the past
    const isPasted = isSessionPasted(session, startDate);
    if (isPasted) {
      return NextResponse.json(
        {error: "Session is in the past"},
        {status: 400}
      );
    }

    const sessionState = getSessionState(session, mid);
    console.log(sessionState);
    if (sessionState.isFull || sessionState.isReserved) {
      const error = sessionState.isReserved
        ? "Session is already reserved"
        : "Session is full";
      return NextResponse.json({error}, {status: 400});
    }

    let reservation: Reservation;
    if (!rest.recurring) {
      const r = await db
        .insert(reservations)
        .values({
          memberId: mid,
          locationId: lid,
          sessionId: sessionId,
          startOn: startDate.split("T")[0],
          memberSubscriptionId: memberSub?.id,
          memberPackageId: memberPkg?.id,
        })
        .returning();
      reservation = r[0];
    } else {
      const rr = await db
        .insert(recurringReservations)
        .values({
          memberId: mid,
          locationId: lid,
          sessionId: sessionId,
          startDate: startDate.split("T")[0],
          memberSubscriptionId: memberSub?.id,
          memberPackageId: memberPkg?.id,
        })
        .returning();
      const {id, intervalThreshold, interval, ...rest} = rr[0];
      reservation = {
        ...rest,
        startOn: startDate.split("T")[0],
        isRecurring: true,
        recurringId: id,
      };
    }

    return NextResponse.json(reservation, {status: 200});
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      {error: "Failed to create reservation"},
      {status: 500}
    );
  }
}
