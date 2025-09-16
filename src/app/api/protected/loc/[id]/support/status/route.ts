import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportAssistants } from "@/db/schemas";

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { status } = body;

    // Validate status
    if (!status || !["Draft", "Active", "Paused"].includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be Draft, Active, or Paused" },
        { status: 400 }
      );
    }

    // Find existing support assistant
    const existingAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!existingAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Update only the status
    const [updatedAssistant] = await db
      .update(supportAssistants)
      .set({
        status,
        updated: new Date(),
      })
      .where(eq(supportAssistants.id, existingAssistant.id))
      .returning();

    // Fetch updated assistant for complete response
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.id, updatedAssistant.id),
    });

    // Serialize dates for consistent API response
    const serializedAssistant = {
      ...supportAssistant,
      createdAt: supportAssistant?.created?.toISOString(),
      updatedAt: supportAssistant?.updated?.toISOString(),
    };

    return NextResponse.json({
      supportAssistant: serializedAssistant,
      message: `Support assistant status changed to ${status}`,
    });
  } catch (error) {
    console.error("Error updating support assistant status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
