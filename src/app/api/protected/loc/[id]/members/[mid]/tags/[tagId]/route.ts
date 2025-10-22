import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { db } from "@/db/db";
import { memberHasTags, members } from "@/db/schemas";
import { eq, and, inArray } from "drizzle-orm";

// DELETE /api/protected/loc/[id]/members/[mid]/tags/[tagId] - Remove a specific tag from a member
export async function DELETE(
    req: Request,
    props: { params: Promise<{ id: string; mid: string; tagId: string }> }
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
  
      // Remove the specific tag assignment for this member
      await db
        .delete(memberHasTags)
        .where(
          and(
            eq(memberHasTags.memberId, params.mid),
            eq(memberHasTags.tagId, params.tagId)
          )
        );
  
      return NextResponse.json({ message: "Tag removed successfully" });
    } catch (error) {
      console.error("Error removing member tag:", error);
      return NextResponse.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  }