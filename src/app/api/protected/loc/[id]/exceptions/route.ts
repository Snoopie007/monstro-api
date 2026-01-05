import { db } from "@/db/db";
import { and, eq, gte, lte, or } from "drizzle-orm";
import { reservationExceptions } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";
import type { CreateExceptionInput, ExceptionInitiator } from "@/types/reservation";

type Props = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/protected/loc/[id]/exceptions
 * 
 * List exceptions for a location with optional filters
 * 
 * Query params:
 * - startDate: ISO date string - Filter exceptions from this date
 * - endDate: ISO date string - Filter exceptions until this date
 * - initiator: exception_initiator - Filter by initiator type
 * - sessionId: string - Filter by specific session
 */
export async function GET(req: NextRequest, props: Props) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  
  const startDate = searchParams.get('startDate');
  const endDate = searchParams.get('endDate');
  const initiator = searchParams.get('initiator') as ExceptionInitiator | null;
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

    if (initiator) {
      conditions.push(eq(reservationExceptions.initiator, initiator));
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

/**
 * POST /api/protected/loc/[id]/exceptions
 * 
 * Create a new exception (holiday block, maintenance closure, etc.)
 * 
 * Body:
 * - reservationId?: string - Specific reservation to create exception for
 * - recurringReservationId?: string - Specific recurring reservation
 * - sessionId?: string - Block a specific session
 * - occurrenceDate: string - Date of the exception (ISO string)
 * - endDate?: string - End date for multi-day blocks (ISO string)
 * - initiator: 'member' | 'vendor' | 'holiday' | 'maintenance'
 * - reason?: string - Reason for the exception
 * - createdBy?: string - Staff ID who created this exception
 */
export async function POST(req: NextRequest, props: Props) {
  const params = await props.params;
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

  // Validate required fields
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
    const [exception] = await db
      .insert(reservationExceptions)
      .values({
        reservationId,
        recurringReservationId,
        locationId: params.id,
        sessionId,
        occurrenceDate: new Date(occurrenceDate),
        endDate: endDate ? new Date(endDate) : undefined,
        initiator,
        reason,
        createdBy,
      })
      .returning();

    return NextResponse.json(exception, { status: 201 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to create exception";
    return NextResponse.json({ error }, { status: 500 });
  }
}

