import { NextResponse, NextRequest } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { eq, and } from "drizzle-orm";
import { memberFields, locations } from "@/db/schemas";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const locationId = params.id;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Simple authorization check - just verify location exists
    // TODO: Add proper user-location access control when available
    const location = await db.query.locations.findFirst({
      where: (location, { eq }) => eq(location.id, locationId),
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Fetch custom fields for this location
    const customFields = await db.query.memberFields.findMany({
      where: (field, { eq }) => eq(field.locationId, locationId),
      orderBy: (field, { asc }) => [asc(field.created)],
    });

    // Transform data for frontend consumption
    const transformedFields = customFields.map((field) => ({
      id: field.id,
      name: field.name,
      type: field.type,
      required: field.required,
      placeholder: field.placeholder || "",
      helpText: field.helpText || "",
      options: field.options || [],
      created: field.created,
      updated: field.updated,
    }));

    return NextResponse.json({
      success: true,
      data: transformedFields,
      meta: {
        total: transformedFields.length,
        locationId: locationId,
      },
    });
  } catch (error) {
    console.error("Error fetching custom fields:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch custom fields",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;
  const locationId = params.id;

  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Simple authorization check - just verify location exists
    // TODO: Add proper user-location access control when available
    const location = await db.query.locations.findFirst({
      where: (location, { eq }) => eq(location.id, locationId),
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    const body = await req.json();
    const {
      name,
      type,
      required = false,
      placeholder = "",
      helpText = "",
      options = [],
    } = body;

    // Validate required fields
    if (!name || !type) {
      return NextResponse.json(
        {
          error: "Missing required fields",
          message: "Name and type are required",
        },
        { status: 400 }
      );
    }

    // Validate field type
    const validTypes = [
      "text",
      "number",
      "date",
      "boolean",
      "select",
      "multi-select",
    ];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        {
          error: "Invalid field type",
          message: `Type must be one of: ${validTypes.join(", ")}`,
        },
        { status: 400 }
      );
    }

    // Create the custom field
    const [newField] = await db
      .insert(memberFields)
      .values({
        name: name.trim(),
        type: type,
        locationId: locationId,
        required: required,
        placeholder: placeholder || null,
        helpText: helpText || null,
        options: options || [],
      })
      .returning();

    // Transform for frontend
    const transformedField = {
      id: newField.id,
      name: newField.name,
      type: newField.type,
      required: newField.required,
      placeholder: newField.placeholder || "",
      helpText: newField.helpText || "",
      options: newField.options || [],
      created: newField.created,
      updated: newField.updated,
    };

    return NextResponse.json({
      success: true,
      data: transformedField,
      message: "Custom field created successfully",
    });
  } catch (error) {
    console.error("Error creating custom field:", error);
    return NextResponse.json(
      {
        error: "Failed to create custom field",
        message: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
