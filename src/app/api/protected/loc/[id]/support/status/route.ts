import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportBots } from "@/db/schemas";

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

    // Find existing support bot
    const existingBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!existingBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Update only the status
    const [updatedBot] = await db
      .update(supportBots)
      .set({
        status,
        updatedAt: new Date(),
      })
      .where(eq(supportBots.id, existingBot.id))
      .returning();

    // Fetch updated bot for complete response
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.id, updatedBot.id),
    });

    // Serialize dates for consistent API response
    const serializedBot = {
      ...supportBot,
      createdAt: supportBot?.createdAt?.toISOString(),
      updatedAt: supportBot?.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      supportBot: serializedBot,
      message: `Support bot status changed to ${status}`,
    });
  } catch (error) {
    console.error("Error updating support bot status:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
