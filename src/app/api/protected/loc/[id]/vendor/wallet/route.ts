
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { eq } from 'drizzle-orm';
import { wallet } from '@/db/schemas';

export async function GET(req: NextRequest, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;

    try {
        const wallet = await db.query.wallet.findFirst({
            where: (wallet, { eq }) => eq(wallet.locationId, params.id),
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

        await db.update(wallet).set({
            ...rest,
            updated: new Date()
        }).where(eq(wallet.id, id))


        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
