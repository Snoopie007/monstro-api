import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportAssistants } from "@/db/schemas";
import { BotModel, BotStatus } from "@/db/schemas/support/";

// Helper function to serialize support assistant data for API response
function serializeSupportAssistant(assistant: any) {
  return {
    ...assistant,
    knowledgeBase: assistant?.knowledgeBase || {
      qa_entries: [],
      document: null,
    },
    createdAt: assistant?.createdAt?.toISOString(),
    updatedAt: assistant?.updatedAt?.toISOString(),
  };
}

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

    // Find existing support assistant for this location - use explicit select for JSONB fields
    const supportAssistantResult = await db
      .select()
      .from(supportAssistants)
      .where(eq(supportAssistants.locationId, params.id))
      .limit(1);

    const supportAssistant = supportAssistantResult[0] || null;

    // Support assistant should already exist from location creation
    if (!supportAssistant) {
      return NextResponse.json(
        {
          error:
            "Support assistant not found for this location. Please contact support.",
        },
        { status: 404 }
      );
    }

    // Serialize data for consistent API response
    const serializedAssistant = serializeSupportAssistant(supportAssistant);

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
    const {
      name,
      prompt,
      initialMessage,
      temperature,
      model,
      status,
      persona,
      knowledgeBase,
    } = body;

    // Validate required fields only if they are being updated
    if (name !== undefined && !name) {
      return NextResponse.json(
        { error: "Name cannot be empty" },
        { status: 400 }
      );
    }

    if (prompt !== undefined && !prompt) {
      return NextResponse.json(
        { error: "Prompt cannot be empty" },
        { status: 400 }
      );
    }

    if (initialMessage !== undefined && !initialMessage) {
      return NextResponse.json(
        { error: "Initial message cannot be empty" },
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
    if (model && !Object.values(BotModel.enumValues).includes(model)) {
      return NextResponse.json(
        { error: "Invalid model. Must be anthropic, gpt, or gemini" },
        { status: 400 }
      );
    }

    // Validate status
    if (status && !Object.values(BotStatus.enumValues).includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be Draft, Active, or Paused" },
        { status: 400 }
      );
    }

    // Find existing support assistant - use explicit select for JSONB fields
    const existingAssistantResult = await db
      .select()
      .from(supportAssistants)
      .where(eq(supportAssistants.locationId, params.id))
      .limit(1);

    const existingAssistant = existingAssistantResult[0] || null;

    if (!existingAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found" },
        { status: 404 }
      );
    }

    // Prepare update data (only include defined values)
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name;
    if (prompt !== undefined) updateData.prompt = prompt;
    if (initialMessage !== undefined)
      updateData.initialMessage = initialMessage;
    if (temperature !== undefined) updateData.temperature = temperature;
    if (model !== undefined) updateData.model = model;
    if (status !== undefined) updateData.status = status;
    if (persona !== undefined) updateData.persona = persona;
    if (knowledgeBase !== undefined) updateData.knowledgeBase = knowledgeBase;

    // Update support assistant and get updated data directly from returning()
    const [updatedAssistant] = await db
      .update(supportAssistants)
      .set(updateData)
      .where(eq(supportAssistants.id, existingAssistant.id))
      .returning();

    // Serialize the updated assistant data
    const serializedAssistant = serializeSupportAssistant(updatedAssistant);

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
