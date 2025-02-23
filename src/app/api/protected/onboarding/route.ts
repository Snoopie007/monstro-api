
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, locationState, vendorProgress } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';
const DEFAULT_LOCATION_STATE = {
    planId: null,
    paymentPlanId: null,
    agreeToTerms: false,
    pkgId: null,
}

export async function POST(req: Request) {
    const data = await req.json();

    try {
        const location = await db.transaction(async (tx) => {
            const [location] = await tx.insert(locations).values({
                ...data,
                phone: data.phone.startsWith('+') ? data.phone.replace(/[^0-9+]/g, '') : `+${data.phone.replace(/[^0-9]/g, '')}`,
                created: new Date(),
            }).returning({ id: locations.id, name: locations.name });

            const [{ status }] = await tx.insert(locationState).values({
                locationId: location.id,
                ...DEFAULT_LOCATION_STATE,
                created: new Date()
            }).returning({ status: locationState.status })

            await tx.insert(vendorProgress).values({
                vendorId: data.vendorId,
                locationId: location.id,
                created: new Date()
            })

            return { ...location, status: "Pending" }
        });

        const encodedId = encodeId(location.id)

        return NextResponse.json({ ...location, id: encodedId }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

