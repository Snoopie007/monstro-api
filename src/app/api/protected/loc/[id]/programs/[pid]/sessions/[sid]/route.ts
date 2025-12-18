import { db } from "@/db/db";
import { and, eq, count } from "drizzle-orm";
import { programSessions, reservations, recurringReservations } from "@/db/schemas";
import { NextRequest, NextResponse } from "next/server";

type props = {
  params: Promise<{ pid: string; sid: string }>;
};
export async function PATCH(
  req: NextRequest,
  props: props
) {

}

export async function DELETE(req: NextRequest, props: props) {
  const params = await props.params;

  try {
    await db.transaction(async (tx) => {

      const session = await tx.query.programSessions.findFirst({
        where: and(
          eq(programSessions.id, params.sid),
          eq(programSessions.programId, params.pid)
        ),
      });

      if (!session) {
        throw new Error("Session not found");
      }

      if (session.canceled) {
        throw new Error("Session already canceled");
      }

      // Check if session has any reservations
      const [reservationCount, recurringCount] = await Promise.all([
        tx.select({ count: count() })
          .from(reservations)
          .where(eq(reservations.sessionId, params.sid)),
        tx.select({ count: count() })
          .from(recurringReservations)
          .where(eq(recurringReservations.sessionId, params.sid)),
      ]);

      const hasReservations =
        (reservationCount[0]?.count ?? 0) > 0 ||
        (recurringCount[0]?.count ?? 0) > 0;

      if (hasReservations) {
        // Soft delete - session has reservations
        await tx.update(programSessions)
          .set({ canceled: true })
          .where(eq(programSessions.id, params.sid));
      } else {
        // Hard delete - no reservations
        await tx.delete(programSessions)
          .where(eq(programSessions.id, params.sid));
      }
    });

    return NextResponse.json({ success: true },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    const error = err instanceof Error ? err.message : "Failed to delete session";
    return NextResponse.json({ error }, { status: 500 });
  }
}