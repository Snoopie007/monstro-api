
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, vendors } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    const data = await req.json();

    try {
        const [{ lid, name }] = await db.insert(locations).values({
            ...data,
            created: new Date(),
            status: "Pending"
        }).returning({ lid: locations.id, name: locations.name });

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

