import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportAssistants } from "@/db/schemas";
import { BotModel, BotStatus } from "@/db/schemas/SupportBotEnums";
import { getDefaultSupportTools } from "@/libs/supportBotDefaults";

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

    // Find existing support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    // Support assistant should already exist from location creation
    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location. Please contact support." },
        { status: 404 }
      );
    }

    // Serialize dates for consistent API response
    const serializedAssistant = {
      ...supportAssistant,
      createdAt: supportAssistant?.createdAt?.toISOString(),
      updatedAt: supportAssistant?.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      supportAssistant: serializedAssistant,
      message: "Support assistant found",
    });
  } catch (error) {
    console.error("Error fetching/creating support assistant:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

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
    const { name, prompt, initialMessage, temperature, model, status, persona } = body;

    // Validate required fields
    if (!name || !prompt || !initialMessage) {
      return NextResponse.json(
        { error: "Name, prompt, and initial message are required" },
        { status: 400 }
      );
    }

    // Validate temperature range
    if (temperature !== undefined && (temperature < 0 || temperature > 100)) {
      return NextResponse.json(
        { error: "Temperature must be between 0 and 100" },
        { status: 400 }
      );
    }

    // Validate model
    if (model && !Object.values(BotModel).includes(model as BotModel)) {
      return NextResponse.json(
        { error: "Invalid model. Must be anthropic, gpt, or gemini" },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !Object.values(BotStatus).includes(status as BotStatus)) {
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
        { error: "Support assistant not found" },
        { status: 404 }
      );
    }

    // Update support assistant
    const [updatedAssistant] = await db
      .update(supportAssistants)
      .set({
        name,
        prompt,
        initialMessage,
        temperature,
        model,
        status,
        persona,
        updatedAt: new Date(),
      })
      .where(eq(supportAssistants.id, existingAssistant.id))
      .returning();

    // Fetch updated assistant
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.id, updatedAssistant.id),
    });

    // Serialize dates for consistent API response
    const serializedAssistant = {
      ...supportAssistant,
      createdAt: supportAssistant?.createdAt?.toISOString(),
      updatedAt: supportAssistant?.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      supportAssistant: serializedAssistant,
      message: "Support assistant updated successfully",
    });
  } catch (error) {
    console.error("Error updating support bot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
