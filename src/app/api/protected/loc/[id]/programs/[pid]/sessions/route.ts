import { db } from "@/db/db";
import { eq, sql } from "drizzle-orm";
import { programSessions, reservations,programs } from "@/db/schemas";
import { NextResponse, NextRequest } from "next/server";
import { hasPermission } from "@/libs/server/permissions";

type Params = {
  id: string;
  pid: string;
};

export async function GET(
  req: NextRequest,
  props: { params: Promise<Params> }
) {
  const params = await props.params;

  try {
    const query = sql<number>`(SELECT COUNT(DISTINCT ${reservations.memberSubscriptionId}) FROM ${reservations} WHERE ${reservations.sessionId} = ${programSessions.id})`;
    const sessions = await db.query.programSessions.findMany({
      where: eq(programSessions.programId, params.pid),
      with: {
        staff: {
          with: {
            user: true
          }
        }
      },
      columns: {
        id: true,
        day: true,
        duration: true,
        time: true,
      },
      extras: {
        reservationsCount: query.as("reservationsCount"),
      },
    });

    return NextResponse.json(sessions, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ pid: string, id: string }> }
) {
  const params = await props.params;
  const { time, duration, day, staffId } = await req.json();

  try {
    const canAddSession = await hasPermission("edit program", params.id);
    if (!canAddSession) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const program = await db.query.programs.findFirst({
      where: eq(programs.id, params.pid),
      columns: {
        instructorId: true
      }
    });

    const finalStaffId = staffId ?? program?.instructorId ?? null;

    await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(programSessions)
        .values({
          programId: params.pid,
          time,
          duration,
          day,
          staffId: finalStaffId
        })
        .returning({
          id: programSessions.id,
          programId: programSessions.programId,
          time: programSessions.time,
          duration: programSessions.duration,
          day: programSessions.day,
          staffId: programSessions.staffId
        });

      return session;
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
