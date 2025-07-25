import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { memberTags, memberHasTags } from "@/db/schemas";
import { eq, and, sql } from "drizzle-orm";

// GET /api/protected/loc/[id]/tags/[tagId] - Get a specific tag
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; tagId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tag = await db.query.memberTags.findFirst({
      where: and(
        eq(memberTags.id, params.tagId),
        eq(memberTags.locationId, params.id)
      ),
    });

    if (!tag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    return NextResponse.json(tag);
  } catch (error) {
    console.error("Error fetching tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// PUT /api/protected/loc/[id]/tags/[tagId] - Update a tag
export async function PUT(
  req: Request,
  props: { params: Promise<{ id: string; tagId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin permission check
    // if (!userHasPermission(session.user, 'manage_tags')) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    const body = await req.json();
    const { name } = body;

    // Verify tag exists and belongs to this location
    const existingTag = await db.query.memberTags.findFirst({
      where: and(
        eq(memberTags.id, params.tagId),
        eq(memberTags.locationId, params.id)
      ),
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Validate name if provided
    if (name !== undefined) {
      if (!name || typeof name !== "string" || name.trim().length === 0) {
        return NextResponse.json(
          { error: "Tag name is required" },
          { status: 400 }
        );
      }

      // Check if another tag with same name exists (excluding current tag)
      const duplicateTag = await db.query.memberTags.findFirst({
        where: and(
          eq(memberTags.locationId, params.id),
          eq(memberTags.name, name.trim()),
          sql`${memberTags.id} != ${params.tagId}`
        ),
      });

      if (duplicateTag) {
        return NextResponse.json(
          { error: "A tag with this name already exists" },
          { status: 409 }
        );
      }
    }

    const updateData: Partial<typeof memberTags.$inferInsert> = {
      updated: new Date(),
    };

    if (name !== undefined) {
      updateData.name = name.trim();
    }

    const [updatedTag] = await db
      .update(memberTags)
      .set(updateData)
      .where(
        and(
          eq(memberTags.id, params.tagId),
          eq(memberTags.locationId, params.id)
        )
      )
      .returning();

    return NextResponse.json(updatedTag);
  } catch (error) {
    console.error("Error updating tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/protected/loc/[id]/tags/[tagId] - Delete a tag
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; tagId: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin permission check
    // if (!userHasPermission(session.user, 'manage_tags')) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

    // Verify tag exists and belongs to this location
    const existingTag = await db.query.memberTags.findFirst({
      where: and(
        eq(memberTags.id, params.tagId),
        eq(memberTags.locationId, params.id)
      ),
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Delete the tag (cascade will remove all member associations)
    await db
      .delete(memberTags)
      .where(
        and(
          eq(memberTags.id, params.tagId),
          eq(memberTags.locationId, params.id)
        )
      );

    return NextResponse.json({ message: "Tag deleted successfully" });
  } catch (error) {
    console.error("Error deleting tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
