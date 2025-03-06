import { db } from "@/db/db";
import { eq, sql } from "drizzle-orm";
import { programSessions, reservations } from "@/db/schemas";
import { NextResponse, NextRequest } from "next/server";

type Params = {
    id: number,
    pid: number,
    lid: number
}
export async function GET(req: NextRequest, props: { params: Promise<Params> }) {
    const params = await props.params;

    try {
        const query = sql<number>`(SELECT COUNT(DISTINCT ${reservations.memberSubscriptionId}) FROM ${reservations} WHERE ${reservations.sessionId} = ${programSessions.id})`;
        const sessions = await db.query.programSessions.findMany({
            where: eq(programSessions.programLevelId, params.lid),
            columns: {
                id: true,
                day: true,
                duration: true,
                time: true,
            },
            extras: {
                reservationsCount: query.as("reservationsCount")
            }
        })

        return NextResponse.json(sessions, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
