import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { programLevels, programSessions } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { ProgramSession } from "@/types";
import { buildConflictUpdateColumns } from "@/libs/server/db";
export async function PUT(req: Request, props: { params: Promise<{ id: string, pid: number, lid: number }> }) {
    const params = await props.params;

    const { sessions, ...data } = await req.json()
    try {

        await db.transaction(async (tx) => {
            await tx.update(programLevels).set({
                ...data
            }).where(eq(programLevels.id, params.lid))


            const uniqueSessions = sessions.filter((session: ProgramSession, index: number, self: ProgramSession[]) =>
                index === self.findIndex((t: ProgramSession) => t.day === session.day && t.time === session.time)
            )

            const updatedSessions = uniqueSessions.map((session: ProgramSession) => ({
                ...session,
                programId: params.pid,
                programLevelId: params.lid,
                status: 1
            }));
            await tx.insert(programSessions).values(updatedSessions).onConflictDoUpdate({
                target: [programSessions.id],
                set: buildConflictUpdateColumns(programSessions, ['day', 'time', 'duration'])
            })
        })

        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: string, pid: number, lid: number }> }) {
    const params = await props.params;
    const session = await auth();
    try {

        if (session) {
            const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/vendor/program-level/${params.lid}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${session.user.token}`,
                    "locationId": `${params.id}`,
                    'Content-Type': 'application/json'
                }
            })
            if (!res.ok) {
                return NextResponse.json({ message: "An error occurred deleting program level." }, { status: 400 });
            }
            return NextResponse.json({ message: "" }, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

