import { db } from "@/db/db";
import { and, eq } from "drizzle-orm";
import { reservationExceptions } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";

type Props = {
  params: Promise<{ id: string; eid: string }>;
};

/**
 * GET /api/protected/loc/[id]/exceptions/[eid]
 * 
 * Get a specific exception by ID
 */
export async function GET(req: NextRequest, props: Props) {
  const params = await props.params;

  try {
    const exception = await db.query.reservationExceptions.findFirst({
      where: and(
        eq(reservationExceptions.id, params.eid),
        eq(reservationExceptions.locationId, params.id)
      ),
      with: {
        reservation: {
          columns: {
            id: true,
            startOn: true,
            programName: true,
          },
          with: {
            member: {
              columns: {
                id: true,
                email: true,
              },
            },
          },
        },
        recurringReservation: {
          columns: {
            id: true,
            startDate: true,
            programName: true,
          },
          with: {
            member: {
              columns: {
                id: true,
                email: true,
              },
            },
          },
        },
        session: {
          columns: {
            id: true,
            time: true,
            day: true,
            duration: true,
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
                email: true,
              },
            },
          },
        },
      },
    });

    if (!exception) {
      return NextResponse.json(
        { error: "Exception not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(exception, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to fetch exception";
    return NextResponse.json({ error }, { status: 500 });
  }
}

/**
 * DELETE /api/protected/loc/[id]/exceptions/[eid]
 * 
 * Remove an exception (e.g., unblock a holiday)
 */
export async function DELETE(req: NextRequest, props: Props) {
  const params = await props.params;

  try {
    const exception = await db.query.reservationExceptions.findFirst({
      where: and(
        eq(reservationExceptions.id, params.eid),
        eq(reservationExceptions.locationId, params.id)
      ),
    });

    if (!exception) {
      return NextResponse.json(
        { error: "Exception not found" },
        { status: 404 }
      );
    }

    await db
      .delete(reservationExceptions)
      .where(eq(reservationExceptions.id, params.eid));

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to delete exception";
    return NextResponse.json({ error }, { status: 500 });
  }
}

/**
 * PATCH /api/protected/loc/[id]/exceptions/[eid]
 * 
 * Update an exception (e.g., change reason or extend date range)
 * 
 * Body:
 * - endDate?: string - Update end date for range
 * - reason?: string - Update reason
 */
export async function PATCH(req: NextRequest, props: Props) {
  const params = await props.params;
  const body = await req.json();

  const { endDate, reason } = body;

  try {
    const exception = await db.query.reservationExceptions.findFirst({
      where: and(
        eq(reservationExceptions.id, params.eid),
        eq(reservationExceptions.locationId, params.id)
      ),
    });

    if (!exception) {
      return NextResponse.json(
        { error: "Exception not found" },
        { status: 404 }
      );
    }

    const updateData: Record<string, unknown> = {};
    
    if (endDate !== undefined) {
      updateData.endDate = endDate ? new Date(endDate) : null;
    }
    
    if (reason !== undefined) {
      updateData.reason = reason;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { error: "No valid fields to update" },
        { status: 400 }
      );
    }

    const [updated] = await db
      .update(reservationExceptions)
      .set(updateData)
      .where(eq(reservationExceptions.id, params.eid))
      .returning();

    return NextResponse.json(updated, { status: 200 });
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to update exception";
    return NextResponse.json({ error }, { status: 500 });
  }
}

