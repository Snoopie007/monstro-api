import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { bots, botPersonas, aiPersona, botScenarios } from "@/db/schemas";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; bid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the specific bot with all related data
    const botWithRelations = await db
      .select({
        id: bots.id,
        name: bots.name,
        prompt: bots.prompt,
        locationId: bots.locationId,
        temperature: bots.temperature,
        initialMessage: bots.initialMessage,
        model: bots.model,
        objectives: bots.objectives,
        invalidNodes: bots.invalidNodes,
        status: bots.status,
        createdAt: bots.createdAt,
        updatedAt: bots.updatedAt,
        // Include persona information
        personas: {
          id: aiPersona.id,
          name: aiPersona.name,
          image: aiPersona.image,
          responseDetails: aiPersona.responseDetails,
          personality: aiPersona.personality,
        },
        // Include scenario information
        scenarios: {
          id: botScenarios.id,
          name: botScenarios.name,
          trigger: botScenarios.trigger,
          examples: botScenarios.examples,
          requirements: botScenarios.requirements,
          yield: botScenarios.yield,
          createdAt: botScenarios.createdAt,
          updatedAt: botScenarios.updatedAt,
        },
      })
      .from(bots)
      .leftJoin(botPersonas, eq(bots.id, botPersonas.botId))
      .leftJoin(aiPersona, eq(botPersonas.personaId, aiPersona.id))
      .leftJoin(botScenarios, eq(bots.id, botScenarios.botId))
      .where(and(eq(bots.id, params.bid), eq(bots.locationId, params.id)));

    if (botWithRelations.length === 0) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Group the results to handle multiple personas and scenarios
    const botData = botWithRelations[0];
    const bot = {
      id: botData.id,
      name: botData.name,
      prompt: botData.prompt,
      locationId: botData.locationId,
      temperature: botData.temperature,
      initialMessage: botData.initialMessage,
      model: botData.model,
      objectives: botData.objectives,
      invalidNodes: botData.invalidNodes,
      status: botData.status,
      createdAt: botData.createdAt,
      updatedAt: botData.updatedAt,
      personas: [] as any[],
      scenarios: [] as any[],
    };

    // Collect unique personas
    const personaMap = new Map();
    for (const row of botWithRelations) {
      if (row.personas?.id && !personaMap.has(row.personas.id)) {
        personaMap.set(row.personas.id, row.personas);
        bot.personas.push(row.personas);
      }
    }

    // Collect unique scenarios
    const scenarioMap = new Map();
    for (const row of botWithRelations) {
      if (row.scenarios?.id && !scenarioMap.has(row.scenarios.id)) {
        scenarioMap.set(row.scenarios.id, row.scenarios);
        bot.scenarios.push(row.scenarios);
      }
    }

    // Serialize dates for consistent API response
    const serializedBot = {
      ...bot,
      createdAt: bot.createdAt ? new Date(bot.createdAt).toISOString() : null,
      updatedAt: bot.updatedAt ? new Date(bot.updatedAt).toISOString() : null,
      personas: bot.personas?.map((persona) => ({
        ...persona,
        createdAt: persona.createdAt
          ? new Date(persona.createdAt).toISOString()
          : null,
        updatedAt: persona.updatedAt
          ? new Date(persona.updatedAt).toISOString()
          : null,
      })),
      scenarios: bot.scenarios?.map((scenario) => ({
        ...scenario,
        createdAt: scenario.createdAt
          ? new Date(scenario.createdAt).toISOString()
          : null,
        updatedAt: scenario.updatedAt
          ? new Date(scenario.updatedAt).toISOString()
          : null,
      })),
    };

    return NextResponse.json({ bot: serializedBot });
  } catch (error) {
    console.error("Error fetching bot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; bid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    // Filter out fields that shouldn't be updated
    const { id, locationId, createdAt, updatedAt, persona, ...updateData } =
      body;

    // Check if bot exists and belongs to the location
    const existingBot = await db.query.bots.findFirst({
      where: (bots, { eq, and }) =>
        and(eq(bots.id, params.bid), eq(bots.locationId, params.id)),
    });

    if (!existingBot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Update the bot
    const updatedBots = await db
      .update(bots)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(and(eq(bots.id, params.bid), eq(bots.locationId, params.id)))
      .returning({
        id: bots.id,
        name: bots.name,
        prompt: bots.prompt,
        locationId: bots.locationId,
        temperature: bots.temperature,
        initialMessage: bots.initialMessage,
        model: bots.model,
        objectives: bots.objectives,
        invalidNodes: bots.invalidNodes,
        status: bots.status,
        createdAt: bots.createdAt,
        updatedAt: bots.updatedAt,
      });

    if (updatedBots.length === 0) {
      return NextResponse.json(
        { error: "Bot not found or no changes made" },
        { status: 404 }
      );
    }

    const updatedBot = updatedBots[0];

    // Handle persona attachment/detachment if persona data was provided
    if (persona !== undefined) {
      // First, remove all existing persona associations for this bot
      await db.delete(botPersonas).where(eq(botPersonas.botId, params.bid));

      // Then, add new persona associations if any were provided
      if (Array.isArray(persona) && persona.length > 0) {
        const personaInserts = persona.map((p: any) => ({
          botId: params.bid,
          personaId: p.id,
        }));

        await db.insert(botPersonas).values(personaInserts);
      }
    }

    // Serialize dates for consistent API response
    const serializedBot = {
      ...updatedBot,
      createdAt: updatedBot.createdAt
        ? new Date(updatedBot.createdAt).toISOString()
        : null,
      updatedAt: updatedBot.updatedAt
        ? new Date(updatedBot.updatedAt).toISOString()
        : null,
    };

    return NextResponse.json({
      bot: serializedBot,
      message: "Bot updated successfully",
    });
  } catch (error) {
    console.error("Error updating bot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; bid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if bot exists and belongs to the location
    const existingBot = await db.query.bots.findFirst({
      where: (bots, { eq, and }) =>
        and(eq(bots.id, params.bid), eq(bots.locationId, params.id)),
    });

    if (!existingBot) {
      return NextResponse.json({ error: "Bot not found" }, { status: 404 });
    }

    // Delete the bot (cascade will handle related records)
    await db
      .delete(bots)
      .where(and(eq(bots.id, params.bid), eq(bots.locationId, params.id)));

    return NextResponse.json({
      message: "Bot deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting bot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
