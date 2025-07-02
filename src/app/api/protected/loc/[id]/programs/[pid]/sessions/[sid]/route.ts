import { db } from "@/db/db";
import { and, eq } from "drizzle-orm";
import { programSessions } from "@/db/schemas";
import { NextResponse } from "next/server";


export async function PUT(
  req: Request,
  props: { params: Promise<{ pid: string; sid: string }> }
) {
  const params = await props.params;
  const body = await req.json();

  try {

    await db.transaction(async (tx) => {
      // Check if session exists and belongs to the program
      const session = await tx.query.programSessions.findFirst({
        where: and(
          eq(programSessions.id, params.sid),
          eq(programSessions.programId, params.pid)
        ),
      });

      if (!session) {
        throw new Error("Session not found");
      }

      // Update the session
      await tx
        .update(programSessions)
        .set({
          ...body,
          updatedAt: new Date(), // Add updated timestamp
        })
        .where(eq(programSessions.id, params.sid));
    });

    return NextResponse.json(
      { 
        success: true, 
        message: "Session updated successfully" 
      },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    
    
    if (err instanceof Error && err.message === "Session not found") {
      return NextResponse.json(
        { error: "Session not found or doesn't belong to this program" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to update session" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  props: { params: Promise<{ pid: string; sid: string }> }
) {
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

      await tx
        .delete(programSessions)
        .where(eq(programSessions.id, params.sid));
    });

    return NextResponse.json(
      { success: true, message: "Session deleted successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error(err);
    if (err instanceof Error && err.message === "Session not found") {
      return NextResponse.json(
        { error: "Session not found or doesn't belong to this program" },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { error: "Failed to delete session" },
      { status: 500 }
    );
  }
}