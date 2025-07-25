import { db } from "@/db/db";
import { reservations } from "@/db/schemas/reservations";
import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";

type Params = {
  id: string;
};

export async function GET(req: Request, props: { params: Promise<Params> }) {
  const { id } = await props.params;

  try {
    const reservationsList = await db.query.reservations.findMany({
      where: (reservation, { eq }) => eq(reservation.locationId, id),
    });

    return NextResponse.json(
      { reservations: reservationsList },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error fetching reservations:", error);
    return NextResponse.json(
      { error: "Failed to fetch reservations" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request, props: { params: Promise<Params> }) {
  const body = await req.json();
  const { id } = await props.params;

  // Handle multiple members (new format) or single member (legacy format)
  const memberIds = body.memberIds || (body.memberId ? [body.memberId] : []);
  const { sessionId, startDate, subscriptionId, packageId } = body;

  if (!memberIds || memberIds.length === 0) {
    return NextResponse.json(
      { error: "At least one member ID is required" },
      { status: 400 }
    );
  }

  try {
    // First, fetch the session to get the duration for calculating endOn
    const session = await db.query.programSessions.findFirst({
      where: (s, { eq }) => eq(s.id, sessionId),
    });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    // Calculate endOn based on startDate and session duration
    const startDateTime = new Date(startDate);
    const endDateTime = new Date(
      startDateTime.getTime() + session.duration * 60000
    );

    // For multiple members, we need to get their subscription/package info
    const reservationsToInsert = [];

    for (const memberId of memberIds) {
      let memberSubscriptionId = subscriptionId || null;
      let memberPackageId = packageId || null;

      // If no specific subscription/package provided, try to find the member's active ones
      if (!memberSubscriptionId && !memberPackageId) {
        // Get the program's plan IDs
        const programWithPlans = await db.query.programs.findFirst({
          where: (p, { eq }) => eq(p.id, session.programId),
          with: {
            planPrograms: true,
          },
        });

        if (programWithPlans) {
          const planIds = programWithPlans.planPrograms.map((pp) => pp.planId);

          // Try to find an active subscription first
          const activeSubscription =
            await db.query.memberSubscriptions.findFirst({
              where: (s, { eq, and, inArray }) =>
                and(
                  eq(s.memberId, memberId),
                  eq(s.locationId, id),
                  eq(s.status, "active"),
                  inArray(s.memberPlanId, planIds)
                ),
            });

          if (activeSubscription) {
            memberSubscriptionId = activeSubscription.id;
          } else {
            // Try to find an active package
            const activePackage = await db.query.memberPackages.findFirst({
              where: (p, { eq, and, inArray }) =>
                and(
                  eq(p.memberId, memberId),
                  eq(p.locationId, id),
                  eq(p.status, "active"),
                  inArray(p.memberPlanId, planIds)
                ),
            });

            if (activePackage) {
              memberPackageId = activePackage.id;
            }
          }
        }
      }

      reservationsToInsert.push({
        startOn: startDateTime,
        endOn: endDateTime,
        memberSubscriptionId,
        memberPackageId,
        sessionId,
        locationId: id,
        memberId,
      });
    }

    // Insert all reservations
    await db.insert(reservations).values(reservationsToInsert);

    return NextResponse.json(
      {
        success: true,
        message: `Successfully added ${memberIds.length} member(s) to session`,
        count: memberIds.length,
      },
      { status: 200 }
    );
  } catch (err) {
    console.error("Error creating reservations:", err);
    return NextResponse.json(
      { error: "Failed to create reservations" },
      { status: 500 }
    );
  }
}
