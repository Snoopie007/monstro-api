import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, desc } from "drizzle-orm";
import { bots, botPersonas, aiPersona, botScenarios } from "@/db/schemas";

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

    // Fetch all bots for the location with related data
    const botsWithRelations = await db
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
        // Include scenario count
        scenarioCount: db.$count(botScenarios, eq(botScenarios.botId, bots.id)),
      })
      .from(bots)
      .leftJoin(botPersonas, eq(bots.id, botPersonas.botId))
      .leftJoin(aiPersona, eq(botPersonas.personaId, aiPersona.id))
      .where(eq(bots.locationId, params.id))
      .orderBy(desc(bots.updatedAt));

    // Group the results by bot to handle multiple personas
    const botsMap = new Map();

    for (const row of botsWithRelations) {
      const botId = row.id;

      if (!botsMap.has(botId)) {
        botsMap.set(botId, {
          id: row.id,
          name: row.name,
          prompt: row.prompt,
          locationId: row.locationId,
          temperature: row.temperature,
          initialMessage: row.initialMessage,
          model: row.model,
          objectives: row.objectives,
          invalidNodes: row.invalidNodes,
          status: row.status,
          createdAt: row.createdAt,
          updatedAt: row.updatedAt,
          personas: [],
          scenarioCount: row.scenarioCount,
        });
      }

      // Add persona if it exists
      if (row.personas?.id) {
        const bot = botsMap.get(botId);
        const personas = row.personas; // Store reference to avoid null issues
        const personaExists = bot.personas.some(
          (p: typeof personas) => p.id === personas.id
        );
        if (!personaExists) {
          bot.personas.push(personas);
        }
      }
    }

    const botsList = Array.from(botsMap.values());

    // Ensure dates are properly serialized
    const serializedBots = botsList.map((bot) => ({
      ...bot,
      createdAt: bot.createdAt ? new Date(bot.createdAt).toISOString() : null,
      updatedAt: bot.updatedAt ? new Date(bot.updatedAt).toISOString() : null,
    }));

    return NextResponse.json({
      bots: serializedBots,
      count: serializedBots.length,
    });
  } catch (error) {
    console.error("Error fetching bots:", error);
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
    const botData = body;

    // Verify the location exists and user has access
    const location = await db.query.locations.findFirst({
      where: (locations, { eq }) => eq(locations.id, params.id),
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Create the bot
    const [newBot] = await db
      .insert(bots)
      .values({
        ...botData,
        locationId: params.id,
        createdAt: new Date(),
      })
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

    // Serialize dates for consistent API response
    const serializedBot = {
      ...newBot,
      createdAt: newBot.createdAt
        ? new Date(newBot.createdAt).toISOString()
        : null,
      updatedAt: newBot.updatedAt
        ? new Date(newBot.updatedAt).toISOString()
        : null,
    };

    return NextResponse.json(
      {
        bot: serializedBot,
        message: "Bot created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating bot:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
