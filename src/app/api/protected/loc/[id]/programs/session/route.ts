import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { programSessions } from "@/db/schemas";
import { NextResponse, NextRequest } from "next/server";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { sessionId } = await req.json();

  try {
    const session = await db
      .select()
      .from(programSessions)
      .where(eq(programSessions.id, sessionId));
    return NextResponse.json({ success: true, session }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const { sessionId } = await req.json();

  try {
    await db.delete(programSessions).where(eq(programSessions.id, sessionId));
    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
