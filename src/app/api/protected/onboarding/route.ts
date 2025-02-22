
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, vendorProgress } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';
const DefaultProgress = {
    planId: null,
    paymentPlanId: null,
    agreedToTerms: false,
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
                progress: DefaultProgress,
                status: "Pending"
            }).returning({ id: locations.id, name: locations.name, progress: locations.progress });

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

