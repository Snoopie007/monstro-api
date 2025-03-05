import { auth } from "@/auth";
import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { programLevels, programSessions } from "@/db/schemas";
import { eq } from "drizzle-orm";

export async function PUT(req: Request, props: { params: Promise<{ id: string, pid: number, lid: number }> }) {
    const params = await props.params;

    const { sessions, ...data } = await req.json()
    try {
        console.log(params)
        const res = await db.transaction(async (tx) => {
            await tx.update(programLevels).set({
                ...data
            }).where(eq(programLevels.id, params.lid))

            await tx.insert(programSessions).values(sessions.map((session: any) => ({
                ...session,
                programLevelId: params.lid,
                status: 1
            })).onConflictDoUpdate({
                target: [programSessions.id],
            }))
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

