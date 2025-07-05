
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, locationState } from '@/db/schemas';
import { parsePhoneNumberFromString } from 'libphonenumber-js';

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
                phone: parsePhoneNumberFromString(data.phone)?.number,
                slug: data.name.toLowerCase().replace(/ /g, '')
            }).returning({ id: locations.id, name: locations.name });

            await tx.insert(locationState).values({
                locationId: location.id,
                ...DEFAULT_LOCATION_STATE
            })

            return { ...location, status: "incomplete" }
        });

        return NextResponse.json({ ...location }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

