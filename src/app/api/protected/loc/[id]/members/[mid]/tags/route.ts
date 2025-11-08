import { NextResponse } from "next/server";
import { auth } from "@/libs/auth/server";
import { db } from "@/db/db";
import { memberTags, memberHasTags, members } from "@/db/schemas";
import { eq, and } from "drizzle-orm";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; mid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Verify member exists and belongs to this location
    const member = await db.query.members.findFirst({
      where: eq(members.id, params.mid),
      with: {
        memberLocations: {
          where: (ml, { eq }) => eq(ml.locationId, params.id),
        },
      },
    });

    if (!member || !member.memberLocations?.length) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Get member's tags
    const memberTagsData = await db
      .select({
        id: memberTags.id,
        name: memberTags.name,
        created: memberTags.created,
        updated: memberTags.updated,
      })
      .from(memberTags)
      .innerJoin(memberHasTags, eq(memberTags.id, memberHasTags.tagId))
      .where(
        and(
          eq(memberHasTags.memberId, params.mid),
          eq(memberTags.locationId, params.id)
        )
      )
      .orderBy(memberTags.name);

    return NextResponse.json(memberTagsData);
  } catch (error) {
    console.error("Error fetching member tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
// POST /api/protected/loc/[id]/members/[mid]/tags - Add a tag to a member
export async function POST(
  req: Request,
  props: { params: Promise<{ id: string; mid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { tagId } = body;

    if (!tagId || typeof tagId !== 'string') {
      return NextResponse.json(
        { error: "tagId must be a non-empty string" },
        { status: 400 }
      );
    }

    // Verify member exists and belongs to this location
    const member = await db.query.members.findFirst({
      where: eq(members.id, params.mid),
      with: {
        memberLocations: {
          where: (ml, { eq }) => eq(ml.locationId, params.id),
        },
      },
    });

    if (!member || !member.memberLocations?.length) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    // Verify tag exists and belongs to this location
    const existingTag = await db.query.memberTags.findFirst({
      where: and(
        eq(memberTags.id, tagId),
        eq(memberTags.locationId, params.id)
      ),
    });

    if (!existingTag) {
      return NextResponse.json({ error: "Tag not found" }, { status: 404 });
    }

    // Check if tag is already assigned to this member
    const existingAssignment = await db.query.memberHasTags.findFirst({
      where: and(
        eq(memberHasTags.memberId, params.mid),
        eq(memberHasTags.tagId, tagId)
      ),
    });

    // Only add if not already assigned
    if (!existingAssignment) {
      await db.insert(memberHasTags).values({
        memberId: params.mid,
        tagId,
      });
    }

    // Return updated tags for this member
    const updatedTags = await db
      .select({
        id: memberTags.id,
        name: memberTags.name,
        created: memberTags.created,
        updated: memberTags.updated,
      })
      .from(memberTags)
      .innerJoin(memberHasTags, eq(memberTags.id, memberHasTags.tagId))
      .where(
        and(
          eq(memberHasTags.memberId, params.mid),
          eq(memberTags.locationId, params.id)
        )
      )
      .orderBy(memberTags.name);

    return NextResponse.json(updatedTags);
  } catch (error) {
    console.error("Error adding tag to member:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}