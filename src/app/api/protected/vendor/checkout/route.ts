
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations, vendors } from '@/db/schemas';
import { decodeId } from '@/libs/server/sqids';
import { eq } from 'drizzle-orm';

export async function POST(req: Request) {
    const data = await req.json();
    const { vendorId, locationId, token, plan, paymentPlan, progress } = data;
    console.log(data)
    try {
        const decodedLocationId = decodeId(locationId);



        await db.transaction(async (tx) => {
            await tx.update(locations).set({
                status: "Active",
                updated: new Date()
            }).where(eq(locations.id, decodedLocationId))
            await db.update(vendors).set({
                onboarding: {
                    ...progress,
                    completed: true,
                    completedSteps: [...progress.completedSteps, progress.currentStep]
                },
                updated: new Date()
            }).where(eq(vendors.id, vendorId))
        })

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

