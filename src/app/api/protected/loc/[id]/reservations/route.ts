
import { db } from "@/db/db";
import { reservations } from "@/db/schemas/reservations";
import { Reservation } from "@/types";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

type Params = {
    id: number,
}

export async function GET(req: Request, props: { params: Promise<Params> }) {
    const { id } = await props.params;

    try {
        const reservationsList = await db.query.reservations.findMany({
            where: (reservation, { eq }) => eq(reservation.locationId, id)
        });

        return NextResponse.json({ reservations: reservationsList }, { status: 200 });
    } catch (error) {
        console.error("Error fetching reservations:", error);
        return NextResponse.json({ error: "Failed to fetch reservations" }, { status: 500 });
    }
}


export async function POST(req: Request, props: { params: Promise<Params> }) {
    const { sessionId, startDate, subscriptionId, packageId, memberId } = await req.json();
    const { id } = await props.params;

    try {

        await db.insert(reservations).values({
            startDate,
            memberSubscriptionId: subscriptionId || null,
            memberPackageId: packageId || null,
            sessionId,
            locationId: id,
            memberId: memberId
        })

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
