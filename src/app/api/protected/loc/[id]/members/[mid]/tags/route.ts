import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { memberTags, memberHasTags, members } from "@/db/schemas";
import { eq, and, inArray } from "drizzle-orm";
import { MemberHasTagInsert } from "@/types";

// GET /api/protected/loc/[id]/members/[mid]/tags - Get tags for a specific member
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

// POST /api/protected/loc/[id]/members/[mid]/tags - Assign tags to a member
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
    const { tagIds } = body;

    if (!Array.isArray(tagIds) || tagIds.length === 0) {
      return NextResponse.json(
        { error: "tagIds must be a non-empty array" },
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

    // Verify all tags exist and belong to this location
    const existingTags = await db.query.memberTags.findMany({
      where: and(
        inArray(memberTags.id, tagIds),
        eq(memberTags.locationId, params.id)
      ),
    });

    if (existingTags.length !== tagIds.length) {
      return NextResponse.json(
        { error: "One or more tags not found" },
        { status: 404 }
      );
    }

    // Get current tag assignments for this member
    const currentAssignments = await db.query.memberHasTags.findMany({
      where: eq(memberHasTags.memberId, params.mid),
    });

    const currentTagIds = currentAssignments.map((a) => a.tagId);

    // Find tags to add and remove
    const tagsToAdd = tagIds.filter((tagId) => !currentTagIds.includes(tagId));
    const tagsToRemove = currentTagIds.filter(
      (tagId) => !tagIds.includes(tagId)
    );

    // Remove tags that are no longer assigned
    if (tagsToRemove.length > 0) {
      await db
        .delete(memberHasTags)
        .where(
          and(
            eq(memberHasTags.memberId, params.mid),
            inArray(memberHasTags.tagId, tagsToRemove)
          )
        );
    }

    // Add new tag assignments
    if (tagsToAdd.length > 0) {
      const newAssignments: MemberHasTagInsert[] = tagsToAdd.map((tagId) => ({
        memberId: params.mid,
        tagId,
      }));

      await db.insert(memberHasTags).values(newAssignments);
    }

    // Return updated tags
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
    console.error("Error updating member tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

// DELETE /api/protected/loc/[id]/members/[mid]/tags - Remove all tags from a member
export async function DELETE(
  req: Request,
  props: { params: Promise<{ id: string; mid: string }> }
) {
  const params = await props.params;

  try {
    const session = await auth();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // TODO: Add admin permission check
    // if (!userHasPermission(session.user, 'manage_member_tags')) {
    //   return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    // }

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

    // Remove all tag assignments for this member
    await db
      .delete(memberHasTags)
      .where(eq(memberHasTags.memberId, params.mid));

    return NextResponse.json({ message: "All tags removed successfully" });
  } catch (error) {
    console.error("Error removing member tags:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
