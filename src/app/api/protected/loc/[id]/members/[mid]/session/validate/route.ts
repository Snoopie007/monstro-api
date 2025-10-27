import { NextResponse } from "next/server";
import { db } from "@/db/db";

export async function GET(
  req: Request,
  props: { params: Promise<{ id: string; mid: string }> }
) {
  const params = await props.params;
  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get("sessionId");

  if (!sessionId) {
    return NextResponse.json(
      { error: "Session ID is required" },
      { status: 400 }
    );
  }

  try {
    // Get session details with program information
    const session = await db.query.programSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
      with: {
        program: {
          with: {
            planPrograms: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Get the plan IDs that have access to this program
    const planIds = session.program.planPrograms.map((pp) => pp.planId);

    if (planIds.length === 0) {
      return NextResponse.json({
        hasAccess: false,
        accessType: null,
        details: "No plans associated with this program",
      });
    }

    // Check member's active subscriptions
    const activeSubscriptions = await db.query.memberSubscriptions.findMany({
      where: (s, { eq, and, inArray }) =>
        and(
          eq(s.memberId, params.mid),
          eq(s.locationId, params.id),
          eq(s.status, "active"),
          inArray(s.memberPlanId, planIds)
        ),
      with: {
        plan: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (activeSubscriptions.length > 0) {
      return NextResponse.json({
        hasAccess: true,
        accessType: "subscription",
        details: `Active subscription: ${activeSubscriptions[0].plan.name}`,
      });
    }

    // Check member's active packages
    const activePackages = await db.query.memberPackages.findMany({
      where: (p, { eq, and, inArray }) =>
        and(
          eq(p.memberId, params.mid),
          eq(p.locationId, params.id),
          eq(p.status, "active"),
          inArray(p.memberPlanId, planIds)
        ),
      with: {
        plan: {
          columns: {
            name: true,
          },
        },
      },
    });

    if (activePackages.length > 0) {
      return NextResponse.json({
        hasAccess: true,
        accessType: "package",
        details: `Active package: ${activePackages[0].plan.name}`,
      });
    }

    // No access found
    return NextResponse.json({
      hasAccess: false,
      accessType: null,
      details: "No valid subscription or package for this session",
    });
  } catch (err) {
    console.error("Validation error:", err);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
