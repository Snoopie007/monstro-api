import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { programs, programSessions } from "@/db/schemas";
import { NextResponse, NextRequest } from "next/server";


export async function GET(req: NextRequest) {

    try {
        const sessions = await db
      .select({
        id: programSessions.id,
        programId: programSessions.programId,
        time: programSessions.time,
        duration: programSessions.duration,
        day: programSessions.day,
        programName: programs.name,
      })
      .from(programSessions)
      .leftJoin(programs, eq(programs.id, programSessions.programId));

        return NextResponse.json({ success: true, sessions }, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}