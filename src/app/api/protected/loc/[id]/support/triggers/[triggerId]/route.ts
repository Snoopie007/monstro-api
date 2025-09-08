import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { supportTriggers, supportAssistants } from "@/db/schemas";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; triggerId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Fetch the specific trigger
    const trigger = await db.query.supportTriggers.findFirst({
      where: and(
        eq(supportTriggers.id, params.triggerId),
        eq(supportTriggers.supportAssistantId, supportAssistant.id)
      ),
    });

    if (!trigger) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
    }

    // Serialize dates for consistent API response
    const serializedTrigger = {
      ...trigger,
      createdAt: trigger.createdAt?.toISOString(),
      updatedAt: trigger.updatedAt?.toISOString(),
    };

    return NextResponse.json({ trigger: serializedTrigger });
  } catch (error) {
    console.error("Error fetching trigger:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; triggerId: string }> }
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
      triggerType,
      triggerPhrases,
      toolCall,
      examples,
      requirements,
      isActive,
    } = body;

    // Get the support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Check if trigger exists and belongs to this support assistant
    const existingTrigger = await db.query.supportTriggers.findFirst({
      where: and(
        eq(supportTriggers.id, params.triggerId),
        eq(supportTriggers.supportAssistantId, supportAssistant.id)
      ),
    });

    if (!existingTrigger) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
    }

    // Validation for required fields if they're being updated
    if (name !== undefined && !name?.trim()) {
      return NextResponse.json(
        { error: "Trigger name cannot be empty" },
        { status: 400 }
      );
    }

    if (triggerPhrases !== undefined && !triggerPhrases?.length) {
      return NextResponse.json(
        { error: "At least one trigger phrase is required" },
        { status: 400 }
      );
    }

    if (toolCall !== undefined && !toolCall?.name) {
      return NextResponse.json(
        { error: "Tool call is required" },
        { status: 400 }
      );
    }

    // Build update data - only include fields that are provided
    const updateData: any = {
      updatedAt: new Date(),
    };

    if (name !== undefined) updateData.name = name.trim();
    if (triggerType !== undefined) updateData.triggerType = triggerType;
    if (triggerPhrases !== undefined)
      updateData.triggerPhrases = triggerPhrases;
    if (toolCall !== undefined) updateData.toolCall = toolCall;
    if (examples !== undefined) updateData.examples = examples;
    if (requirements !== undefined) updateData.requirements = requirements;
    if (isActive !== undefined) updateData.isActive = isActive;

    // Update the trigger
    const [updatedTrigger] = await db
      .update(supportTriggers)
      .set(updateData)
      .where(
        and(
          eq(supportTriggers.id, params.triggerId),
          eq(supportTriggers.supportAssistantId, supportAssistant.id)
        )
      )
      .returning();

    if (!updatedTrigger) {
      return NextResponse.json(
        { error: "Failed to update trigger" },
        { status: 404 }
      );
    }

    // Serialize dates for consistent API response
    const serializedTrigger = {
      ...updatedTrigger,
      createdAt: updatedTrigger.createdAt?.toISOString(),
      updatedAt: updatedTrigger.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      trigger: serializedTrigger,
      message: "Trigger updated successfully",
    });
  } catch (error) {
    console.error("Error updating trigger:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; triggerId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the support assistant for this location
    const supportAssistant = await db.query.supportAssistants.findFirst({
      where: eq(supportAssistants.locationId, params.id),
    });

    if (!supportAssistant) {
      return NextResponse.json(
        { error: "Support assistant not found for this location" },
        { status: 404 }
      );
    }

    // Check if trigger exists and belongs to this support assistant
    const existingTrigger = await db.query.supportTriggers.findFirst({
      where: and(
        eq(supportTriggers.id, params.triggerId),
        eq(supportTriggers.supportAssistantId, supportAssistant.id)
      ),
    });

    if (!existingTrigger) {
      return NextResponse.json({ error: "Trigger not found" }, { status: 404 });
    }

    // Delete the trigger
    await db
      .delete(supportTriggers)
      .where(
        and(
          eq(supportTriggers.id, params.triggerId),
          eq(supportTriggers.supportAssistantId, supportAssistant.id)
        )
      );

    return NextResponse.json({
      message: "Trigger deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting trigger:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
