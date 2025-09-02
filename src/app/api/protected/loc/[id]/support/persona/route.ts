import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { supportBots, supportBotPersonas } from "@/db/schemas";

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

    // Find the support bot for this location
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Get the persona (should only be one per support bot)
    const persona = await db.query.supportBotPersonas.findFirst({
      where: eq(supportBotPersonas.supportBotId, supportBot.id),
    });

    // Serialize dates for consistent API response
    const serializedPersona = persona
      ? {
          ...persona,
          createdAt: persona.createdAt?.toISOString(),
          updatedAt: persona.updatedAt?.toISOString(),
        }
      : null;

    return NextResponse.json({
      persona: serializedPersona,
      supportBotId: supportBot.id,
    });
  } catch (error) {
    console.error("Error fetching support bot persona:", error);
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
    const { name, image, responseStyle, personalityTraits } = body;

    // Validate required fields
    if (!name || !responseStyle) {
      return NextResponse.json(
        { error: "Name and response style are required" },
        { status: 400 }
      );
    }

    // Find the support bot for this location
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Check if persona already exists (only one persona per support bot)
    const existingPersona = await db.query.supportBotPersonas.findFirst({
      where: eq(supportBotPersonas.supportBotId, supportBot.id),
    });

    if (existingPersona) {
      return NextResponse.json(
        {
          error:
            "Support bot already has a persona. Update or delete the existing one first.",
        },
        { status: 409 }
      );
    }

    // Create the persona
    const [newPersona] = await db
      .insert(supportBotPersonas)
      .values({
        supportBotId: supportBot.id,
        name,
        image,
        responseStyle,
        personalityTraits: personalityTraits || [],
      })
      .returning();

    // Serialize dates for consistent API response
    const serializedPersona = {
      ...newPersona,
      createdAt: newPersona.createdAt?.toISOString(),
      updatedAt: newPersona.updatedAt?.toISOString(),
    };

    return NextResponse.json(
      {
        persona: serializedPersona,
        message: "Support bot persona created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating support bot persona:", error);
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
    const { name, image, responseStyle, personalityTraits } = body;

    // Validate required fields
    if (!name || !responseStyle) {
      return NextResponse.json(
        { error: "Name and response style are required" },
        { status: 400 }
      );
    }

    // Find the support bot for this location
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Check if persona exists
    const existingPersona = await db.query.supportBotPersonas.findFirst({
      where: eq(supportBotPersonas.supportBotId, supportBot.id),
    });

    if (!existingPersona) {
      return NextResponse.json(
        { error: "No persona found to update. Create one first." },
        { status: 404 }
      );
    }

    // Update the persona
    const [updatedPersona] = await db
      .update(supportBotPersonas)
      .set({
        name,
        image,
        responseStyle,
        personalityTraits: personalityTraits || [],
        updatedAt: new Date(),
      })
      .where(eq(supportBotPersonas.id, existingPersona.id))
      .returning();

    // Serialize dates for consistent API response
    const serializedPersona = {
      ...updatedPersona,
      createdAt: updatedPersona.createdAt?.toISOString(),
      updatedAt: updatedPersona.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      persona: serializedPersona,
      message: "Support bot persona updated successfully",
    });
  } catch (error) {
    console.error("Error updating support bot persona:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Find the support bot for this location
    const supportBot = await db.query.supportBots.findFirst({
      where: eq(supportBots.locationId, params.id),
    });

    if (!supportBot) {
      return NextResponse.json(
        { error: "Support bot not found for this location" },
        { status: 404 }
      );
    }

    // Check if persona exists
    const existingPersona = await db.query.supportBotPersonas.findFirst({
      where: eq(supportBotPersonas.supportBotId, supportBot.id),
    });

    if (!existingPersona) {
      return NextResponse.json(
        { error: "No persona found to delete" },
        { status: 404 }
      );
    }

    // Delete the persona
    await db
      .delete(supportBotPersonas)
      .where(eq(supportBotPersonas.id, existingPersona.id));

    return NextResponse.json({
      message: "Support bot persona deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting support bot persona:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
