import { NextResponse } from "next/server";
import { db } from "@/db/db";



// Validates whether a member has access to a session
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

    const activeSubscriptions = await db.query.memberSubscriptions.findMany({
      where: (s, { eq, and }) =>
        and(
          eq(s.memberId, params.mid),
          eq(s.locationId, params.id),
          eq(s.status, "active")
        ),
      with: {
        pricing: {
          with: {
            plan: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const matchingSubscription = activeSubscriptions.find(
      (sub) => sub.pricing?.plan?.id && planIds.includes(sub.pricing.plan.id)
    );

    if (matchingSubscription) {
      return NextResponse.json({
        hasAccess: true,
        accessType: "subscription",
        details: `Active subscription: ${matchingSubscription.pricing?.plan?.name ?? 'Unknown'}`,
      });
    }

    const activePackages = await db.query.memberPackages.findMany({
      where: (p, { eq, and }) =>
        and(
          eq(p.memberId, params.mid),
          eq(p.locationId, params.id),
          eq(p.status, "active")
        ),
      with: {
        pricing: {
          with: {
            plan: {
              columns: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    const matchingPackage = activePackages.find(
      (pkg) => pkg.pricing?.plan?.id && planIds.includes(pkg.pricing.plan.id)
    );

    if (matchingPackage) {
      return NextResponse.json({
        hasAccess: true,
        accessType: "package",
        details: `Active package: ${matchingPackage.pricing?.plan?.name ?? 'Unknown'}`,
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
