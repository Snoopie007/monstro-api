import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { programLevels, programSessions } from "@/db/schemas";
import { eq } from "drizzle-orm";


export async function PUT(req: Request, { params }: { params: { id: string; pid: string; lid: string } }) {
    try {
        const { id, pid, lid } = await params;
        console.log("PUT Request - Params:", { id, pid, lid });

        const body = await req.json();


        await db.update(programLevels)
            .set({
                name: body.name,
                capacity: body.capacity,
                minAge: body.min_age,
                maxAge: body.max_age,
            })
            .where(eq(programLevels.id, Number(lid)));


        if (body.sessions && Array.isArray(body.sessions)) {
            for (const session of body.sessions) {
                if (session.duration_time) {
                    await db.insert(programSessions)
                        .values({
                            day: session.day,
                            time: session.time,
                            duration: session.duration_time,
                            programLevelId: Number(lid),
                        })
                        .onConflictDoUpdate({
                            target: [programSessions.id],
                            set: {
                                duration: session.duration_time,
                            },
                        });
                }
            }
        }


        const updatedProgramLevel = await db.query.programLevels.findFirst({
            where: eq(programLevels.id, Number(lid)),
            with: { sessions: true },
        });

        return NextResponse.json(
            { message: "Program level updated successfully.", data: updatedProgramLevel },
            { status: 200 }
        );

    } catch (error) {
        console.error("===== Error in programLevelUpdate =====", error);
        return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
    }
}


export async function DELETE(req: Request) {
    try {
        const body = await req.json();
        const { levelId } = body; 

        if (!levelId) {
            return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
        }

        console.log("DELETE Request - level ID:", levelId);

        
        const level = await db.query.programLevels.findFirst({
            where: eq(programLevels.id, Number(levelId)),
        });

        console.log("Session:", level);

        if (!level) {
            return NextResponse.json({ error: "Session not found." }, { status: 404 });
        }

        
        await db.delete(programLevels).where(eq(programLevels.id, Number(levelId)));

        return NextResponse.json({ message: "Session deleted successfully." }, { status: 200 });

    } catch (error) {
        console.error("===== Error in session DELETE =====", error);
        return NextResponse.json({ error: "An error occurred while deleting the session." }, { status: 500 });
    }
}