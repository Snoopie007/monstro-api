
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { wallets } from '@/db/schemas';

export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;

    try {
        const wallet = await db.query.wallets.findFirst({
            where: (wallets, { eq }) => eq(wallets.locationId, params.id),
        })

        return NextResponse.json(wallet, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function POST(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const body = await req.json();
    const { id, ...rest } = body;
    try {

        await db.update(wallets).set({
            ...rest,
            updated: new Date()
        }).where(eq(wallets.id, id))


        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
