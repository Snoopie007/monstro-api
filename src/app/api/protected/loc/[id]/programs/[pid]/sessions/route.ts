import { db } from "@/db/db";
import { eq, sql } from "drizzle-orm";
import { programSessions, reservations } from "@/db/schemas";
import { NextResponse, NextRequest } from "next/server";

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
  props: { params: Promise<{ pid: string }> }
) {
  const params = await props.params;
  const { time, duration, day } = await req.json();

  try {
    await db.transaction(async (tx) => {
      const [session] = await tx
        .insert(programSessions)
        .values({
          programId: params.pid,
          time,
          duration,
          day,
        })
        .returning({
          id: programSessions.id,
          programId: programSessions.programId,
          time: programSessions.time,
          duration: programSessions.duration,
          day: programSessions.day,
        });

      return session;
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
