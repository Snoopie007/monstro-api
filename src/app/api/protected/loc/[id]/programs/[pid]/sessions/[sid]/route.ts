import { db } from "@/db/db";
import { and, eq } from "drizzle-orm";
import { programSessions } from "@/db/schemas";
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

      await tx.update(programSessions)
        .set({ canceled: true })
        .where(eq(programSessions.id, params.sid));
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