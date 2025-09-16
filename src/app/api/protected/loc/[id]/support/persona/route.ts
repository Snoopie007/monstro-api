import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { supportAssistants } from "@/db/schemas";

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

    // Find the support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Get the persona from the support assistant (now stored as JSONB)
    const persona = supportAssistant.persona || {};

    return NextResponse.json({
      persona: persona,
      supportAssistantId: supportAssistant.id,
    });
  } catch (error) {
    console.error("Error fetching support assistant persona:", error);
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

    // Find the support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Check if persona already exists
    if (supportAssistant.persona && Object.keys(supportAssistant.persona).length > 0) {
      return NextResponse.json(
        {
          error:
            "Support assistant already has a persona. Update the existing one instead.",
        },
        { status: 409 }
      );
    }

    // Create the persona object
    const personaData = {
      avatar: "",
      personality: [],
      name,
      image,
      responseStyle,
      personalityTraits: personalityTraits || [],
    };

    // Update the support assistant with the persona
    const [updatedAssistant] = await db
      .update(supportAssistants)
      .set({
        persona: personaData,
        updated: new Date(),
      })
      .where(eq(supportAssistants.id, supportAssistant.id))
      .returning();

    return NextResponse.json(
      {
        persona: personaData,
        message: "Support assistant persona created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating support assistant persona:", error);
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

    // Find the support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Check if persona exists
    if (!supportAssistant.persona || Object.keys(supportAssistant.persona).length === 0) {
      return NextResponse.json(
        { error: "No persona found to update. Create one first." },
        { status: 404 }
      );
    }

    // Update the persona object
    const updatedPersonaData = {
      avatar: image,
      personality: personalityTraits,
      name,
      image,
      responseStyle,
      personalityTraits: personalityTraits || [],
    };

    // Update the support assistant with the new persona
    const [updatedAssistant] = await db
      .update(supportAssistants)
      .set({
        persona: updatedPersonaData,
        updated: new Date(),
      })
      .where(eq(supportAssistants.id, supportAssistant.id))
      .returning();

    return NextResponse.json({
      persona: updatedPersonaData,
      message: "Support assistant persona updated successfully",
    });
  } catch (error) {
    console.error("Error updating support assistant persona:", error);
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

    // Find the support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Check if persona exists
    if (!supportAssistant.persona || Object.keys(supportAssistant.persona).length === 0) {
      return NextResponse.json(
        { error: "No persona found to delete" },
        { status: 404 }
      );
    }

    // Clear the persona by setting it to an empty object
    await db
      .update(supportAssistants)
      .set({
        persona: undefined,
        updated: new Date(),
      })
      .where(eq(supportAssistants.id, supportAssistant.id));

    return NextResponse.json({
      message: "Support assistant persona deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting support assistant persona:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
