
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, locationState, vendorLevels } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';
import { formatPhoneNumber } from '@/libs/server/db';
import { sql } from 'drizzle-orm';

const DEFAULT_LOCATION_STATE = {
    planId: null,
    paymentPlanId: null,
    agreeToTerms: false,
    pkgId: null,
    usagePercent: 0,
}

export async function POST(req: Request) {
    const data = await req.json();

    try {

        const location = await db.transaction(async (tx) => {
            const [location] = await tx.insert(locations).values({
                ...data,
                phone: formatPhoneNumber(data.phone),
                slug: data.name.toLowerCase().replace(/ /g, '')
            }).returning({ id: locations.id, name: locations.name });

            await tx.insert(locationState).values({
                locationId: location.id,
                ...DEFAULT_LOCATION_STATE
            })

            await tx.insert(vendorLevels).values({
                vendorId: data.vendorId,
                locationId: location.id
            })

            return { ...location, status: "incomplete" }
        });

        const encodedId = encodeId(location.id)

        return NextResponse.json({ ...location, id: encodedId }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

