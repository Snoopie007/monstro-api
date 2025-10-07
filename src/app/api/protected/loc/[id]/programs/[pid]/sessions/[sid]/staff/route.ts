import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { programSessions, staffs } from "@/db/schemas";
import { eq } from "drizzle-orm";

// GET - Get staff assigned to session
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string; pid: string; sid: string } }
) {
  try {
    const session = await db.query.programSessions.findFirst({
      where: eq(programSessions.id, params.sid),
      with: {
        staff: {
          with: {
            user: true
          }
        }
      }
    });
    
    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    
    return NextResponse.json({ staff: session.staff || null });
  } catch (error) {
    console.error("Error fetching session staff:", error);
    return NextResponse.json({ error: "Failed to fetch session staff" }, { status: 500 });
  }
}

// PUT - Assign staff to session
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string; pid: string; sid: string } }
) {
  try {
    const body = await request.json();
    const { staffId } = body;
    
    // Validate staff exists if provided
    if (staffId) {
      const [staff] = await db.query.staffs.findMany({
        where: eq(staffs.id, staffId),
        limit: 1
      });
      
      if (!staff) {
        return NextResponse.json({ error: "Staff not found" }, { status: 404 });
      }
    }
    
    const [updatedSession] = await db.update(programSessions)
      .set({ staffId: staffId || null })
      .where(eq(programSessions.id, params.sid))
      .returning();
      
    if (!updatedSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    
    return NextResponse.json(updatedSession);
  } catch (error) {
    console.error("Error updating session staff:", error);
    return NextResponse.json({ error: "Failed to update session staff" }, { status: 500 });
  }
}

// DELETE - Remove staff from session
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; pid: string; sid: string } }
) {
  try {
    const [updatedSession] = await db.update(programSessions)
      .set({ staffId: null })
      .where(eq(programSessions.id, params.sid))
      .returning();
      
    if (!updatedSession) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }
    
    return NextResponse.json({ success: true, session: updatedSession });
  } catch (error) {
    console.error("Error removing session staff:", error);
    return NextResponse.json({ error: "Failed to remove session staff" }, { status: 500 });
  }
}