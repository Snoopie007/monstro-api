import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, desc } from "drizzle-orm";
import { aiPersona } from "@/db/schemas";

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

    // Fetch all personas for the location
    const personas = await db
      .select()
      .from(aiPersona)
      .where(eq(aiPersona.locationId, params.id))
      .orderBy(desc(aiPersona.createdAt));

    // Serialize dates for consistent API response
    const serializedPersonas = personas.map((persona) => ({
      ...persona,
      createdAt: persona.createdAt?.toISOString(),
      updatedAt: persona.updatedAt?.toISOString(),
    }));

    return NextResponse.json({
      personas: serializedPersonas,
      count: serializedPersonas.length,
    });
  } catch (error) {
    console.error("Error fetching personas:", error);
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
    const personaData = body;

    // Create the persona
    const [newPersona] = await db
      .insert(aiPersona)
      .values({
        ...personaData,
        locationId: params.id,
        createdAt: new Date(),
      })
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

    // Serialize dates for consistent API response
    const serializedPersona = {
      ...newPersona,
      createdAt: newPersona.createdAt?.toISOString(),
      updatedAt: newPersona.updatedAt?.toISOString(),
    };

    return NextResponse.json(
      {
        persona: serializedPersona,
        message: "Persona created successfully",
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating persona:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
