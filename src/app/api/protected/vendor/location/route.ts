
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { locations } from '@/db/schemas';
import { encodeId } from '@/libs/server/sqids';

export async function POST(req: Request) {
    const body = await req.json();
    const { vendorId, ...location } = body;
    console.log(body)
    try {

        // const [{ id: lid }] = await db.insert(locations).values({
        //     ...location,
        //     vendorId
        // }).returning({ id: locations.id });

        const encodedId = encodeId(1)

        return NextResponse.json({ lid: encodedId }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

