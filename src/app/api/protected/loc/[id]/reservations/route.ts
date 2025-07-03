import { db } from "@/db/db";
import { reservations } from "@/db/schemas/reservations";
import { NextResponse } from "next/server";

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
  const { sessionId, startDate, subscriptionId, packageId, memberId } =
    await req.json();
  const { id } = await props.params;

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

    await db.insert(reservations).values({
      startOn: startDateTime,
      endOn: endDateTime,
      memberSubscriptionId: subscriptionId || null,
      memberPackageId: packageId || null,
      sessionId,
      locationId: id,
      memberId: memberId,
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (err) {
    console.log(err);
    return NextResponse.json({ error: err }, { status: 500 });
  }
}
