import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, desc } from "drizzle-orm";
import { supportTriggers } from "@/db/schemas";
import { TriggerType } from "@/db/schemas/SupportBotEnums";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the support bot for this location first to ensure it exists
    const supportBot = await db.query.supportBots.findFirst({
      where: (bots, { eq }) => eq(bots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Fetch all triggers for this support bot
    const triggers = await db.query.supportTriggers.findMany({
      where: eq(supportTriggers.supportBotId, supportBot.id),
      orderBy: [desc(supportTriggers.createdAt)],
    });

    // Serialize dates for consistent API response
    const serializedTriggers = triggers.map((trigger) => ({
      ...trigger,
      createdAt: trigger.createdAt?.toISOString(),
      updatedAt: trigger.updatedAt?.toISOString(),
    }));

    return NextResponse.json({
      triggers: serializedTriggers,
      count: serializedTriggers.length,
    });
  } catch (error) {
    console.error("Error fetching triggers:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(
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
    const {
      name,
      triggerType = TriggerType.Keyword,
      triggerPhrases = [],
      toolCall,
      examples = [],
      requirements = [],
      isActive = true,
    } = body;

    // Validation
    if (!name?.trim()) {
      return NextResponse.json(
        { error: "Trigger name is required" },
        { status: 400 }
      );
    }

    if (!triggerPhrases?.length) {
      return NextResponse.json(
        { error: "At least one trigger phrase is required" },
        { status: 400 }
      );
    }

    if (!toolCall?.name) {
      return NextResponse.json(
        { error: "Tool call is required" },
        { status: 400 }
      );
    }

    // Get the support bot for this location
    const supportBot = await db.query.supportBots.findFirst({
      where: (bots, { eq }) => eq(bots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Create the trigger
    const [newTrigger] = await db
      .insert(supportTriggers)
      .values({
        supportBotId: supportBot.id,
        name: name.trim(),
        triggerType,
        triggerPhrases,
        toolCall,
        examples,
        requirements,
        isActive,
        createdAt: new Date(),
      })
      .returning();

    // Serialize dates for consistent API response
    const serializedTrigger = {
      ...newTrigger,
      createdAt: newTrigger.createdAt?.toISOString(),
      updatedAt: newTrigger.updatedAt?.toISOString(),
    };

    return NextResponse.json(
      {
        trigger: serializedTrigger,
        message: "Trigger created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating trigger:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
