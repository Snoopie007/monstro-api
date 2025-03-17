
import { db } from "@/db/db";
import { reservations } from "@/db/schemas/reservations";
import { Reservation } from "@/types";
import { NextResponse } from "next/server";

type Params = {
    id: number,
}
export async function POST(req: Request, props: { params: Promise<Params> }) {
    const { sessionIds, subscriptionId, packageId, memberId } = await req.json();
    const { id } = await props.params;
    try {
        const newReservations: Reservation[] = []
        sessionIds.forEach((sid: number) => {
            newReservations.push({
                memberSubscriptionId: subscriptionId || null,
                memberPackageId: packageId || null,
                sessionId: sid,
                status: "active",
                locationId: id,
                memberId: memberId
            })
        })

        await db.insert(reservations).values(newReservations)

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
