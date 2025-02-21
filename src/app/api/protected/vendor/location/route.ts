
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, vendorProgress, vendors } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    const data = await req.json();

    try {
        const { lid, name } = await db.transaction(async (tx) => {
            const [location] = await tx.insert(locations).values({
                ...data,
                phone: data.phone.startsWith('+') ? data.phone.replace(/[^0-9+]/g, '') : `+${data.phone.replace(/[^0-9]/g, '')}`,
                created: new Date(),
                status: "Pending"
            }).returning({ id: locations.id, name: locations.name });

            await tx.insert(vendorProgress).values({
                vendorId: data.vendorId,
                locationId: location.id,
                created: new Date()
            })

            return { lid: location.id, name: location.name }
        });

        const encodedId = encodeId(lid)

        await db.update(vendors).set({
            onboarding: {
                currentStep: 2,
                completedSteps: [1],
                plan: null,
                pkg: null,
                agreedToTerms: false,
                paymentPlan: null,
                completed: false
            },
            updated: new Date()
        }).where(eq(vendors.id, data.vendorId))

        return NextResponse.json({ lid: encodedId, name: name }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

