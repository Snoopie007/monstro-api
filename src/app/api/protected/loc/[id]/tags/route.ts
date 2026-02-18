import { NextResponse } from "next/server";
import { auth } from "@/libs/auth/server";
import { db } from "@/db/db";
import { memberTags, memberHasTags } from "@subtrees/schemas";
import { eq, and, sql } from "drizzle-orm";
import { MemberTagInsert } from "@subtrees/types";

// GET /api/protected/loc/[id]/tags - Get all tags for a location
export async function GET(
  req: Request,
  props: { params: Promise<{ id: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all tags for the location with member count
    const tags = await db
      .select({
        id: memberTags.id,
        name: memberTags.name,
        locationId: memberTags.locationId,
        created: memberTags.created,
        updated: memberTags.updated,
        memberCount: sql<number>`count(${memberHasTags.memberId})::integer`.as(
          "memberCount"
        ),
      })
      .from(memberTags)
      .leftJoin(memberHasTags, eq(memberTags.id, memberHasTags.tagId))
      .where(eq(memberTags.locationId, params.id))
      .groupBy(
        memberTags.id,
        memberTags.name,
        memberTags.locationId,
        memberTags.created,
        memberTags.updated
      )
      .orderBy(memberTags.name);

    return NextResponse.json(tags);
  } catch (error) {
    console.error("Error fetching tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// POST /api/protected/loc/[id]/tags - Create a new tag
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string }> }
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

    if (!name || typeof name !== "string" || name.trim().length === 0) {
      return NextResponse.json(
        { error: "Tag name is required" },
        { status: 400 }
      );
    }

    // Check if tag with same name already exists for this location
    const existingTag = await db.query.memberTags.findFirst({
      where: and(
        eq(memberTags.locationId, params.id),
        eq(memberTags.name, name.trim())
      ),
    });

    if (existingTag) {
      return NextResponse.json(
        { error: "A tag with this name already exists" },
        { status: 409 }
      );
    }

    const tagData: MemberTagInsert = {
      name: name.trim(),
      locationId: params.id,
    };

    const [newTag] = await db.insert(memberTags).values(tagData).returning();

    return NextResponse.json(newTag, { status: 201 });
  } catch (error) {
    console.error("Error creating tag:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
