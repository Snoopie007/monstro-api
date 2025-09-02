import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportBots, supportBotPersonas } from "@/db/schemas";
import { BotModel, BotStatus } from "@/db/schemas/SupportBotEnums";

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

    // Try to find existing support bot for this location
    let supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    // Auto-create support bot if it doesn't exist (User Story 1.1)
    if (!supportBot) {
      const [newBot] = await db
        .insert(supportBots)
        .values({
          locationId: params.id,
          name: "Support Bot",
          prompt: "You are a helpful customer support assistant.",
          initialMessage:
            "Hi! I'm here to help you. What can I assist you with today?",
          temperature: 0,
          model: BotModel.GPT,
          status: BotStatus.Draft,
          availableTools: [],
        })
        .returning();

      // Fetch the newly created bot
      supportBot = await db.query.supportBots.findFirst({
        where: eq(supportBots.id, newBot.id),
      });
    }

    // Serialize dates for consistent API response
    const serializedBot = {
      ...supportBot,
      createdAt: supportBot?.createdAt?.toISOString(),
      updatedAt: supportBot?.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      supportBot: serializedBot,
      message: supportBot ? "Support bot found" : "Support bot created",
    });
  } catch (error) {
    console.error("Error fetching/creating support bot:", error);
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
    const { name, prompt, initialMessage, temperature, model, status } = body;

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

    // Find existing support bot
    const existingBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!existingBot) {
      return NextResponse.json(
        { error: "Support bot not found" },
        { status: 404 }
      );
    }

    // Update support bot
    const [updatedBot] = await db
      .update(supportBots)
      .set({
        name,
        prompt,
        initialMessage,
        temperature,
        model,
        status,
        updatedAt: new Date(),
      })
      .where(eq(supportBots.id, existingBot.id))
      .returning();

    // Fetch updated bot
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
      message: "Support bot updated successfully",
    });
  } catch (error) {
    console.error("Error updating support bot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
