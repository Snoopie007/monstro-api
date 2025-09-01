import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { aiPersona } from "@/db/schemas";

export async function GET(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch the specific persona
    const personas = await db
      .select()
      .from(aiPersona)
      .where(
        and(eq(aiPersona.id, params.pid), eq(aiPersona.locationId, params.id))
      );

    if (personas.length === 0) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    const persona = personas[0];

    // Serialize dates for consistent API response
    const serializedPersona = {
      ...persona,
      createdAt: persona.createdAt?.toISOString(),
      updatedAt: persona.updatedAt?.toISOString(),
    };

    return NextResponse.json({ persona: serializedPersona });
  } catch (error) {
    console.error("Error fetching persona:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const updateData = body;

    // Check if persona exists and belongs to the location
    const existingPersona = await db.query.aiPersona.findFirst({
      where: (aiPersona, { eq, and }) =>
        and(eq(aiPersona.id, params.pid), eq(aiPersona.locationId, params.id)),
    });

    if (!existingPersona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Update the persona
    const updatedPersonas = await db
      .update(aiPersona)
      .set({
        ...updateData,
        updatedAt: new Date(),
      })
      .where(
        and(eq(aiPersona.id, params.pid), eq(aiPersona.locationId, params.id))
      )
      .returning({
        id: aiPersona.id,
        name: aiPersona.name,
        image: aiPersona.image,
        responseDetails: aiPersona.responseDetails,
        personality: aiPersona.personality,
        locationId: aiPersona.locationId,
        createdAt: aiPersona.createdAt,
        updatedAt: aiPersona.updatedAt,
      });

    if (updatedPersonas.length === 0) {
      return NextResponse.json(
        { error: "Persona not found or no changes made" },
        { status: 404 }
      );
    }

    const updatedPersona = updatedPersonas[0];

    // Serialize dates for consistent API response
    const serializedPersona = {
      ...updatedPersona,
      createdAt: updatedPersona.createdAt?.toISOString(),
      updatedAt: updatedPersona.updatedAt?.toISOString(),
    };

    return NextResponse.json({
      persona: serializedPersona,
      message: "Persona updated successfully",
    });
  } catch (error) {
    console.error("Error updating persona:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  props: { params: Promise<{ id: string; pid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if persona exists and belongs to the location
    const existingPersona = await db.query.aiPersona.findFirst({
      where: (aiPersona, { eq, and }) =>
        and(eq(aiPersona.id, params.pid), eq(aiPersona.locationId, params.id)),
    });

    if (!existingPersona) {
      return NextResponse.json({ error: "Persona not found" }, { status: 404 });
    }

    // Delete the persona (cascade will handle related records)
    await db
      .delete(aiPersona)
      .where(
        and(eq(aiPersona.id, params.pid), eq(aiPersona.locationId, params.id))
      );

    return NextResponse.json({
      message: "Persona deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting persona:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
