
import { NextResponse } from 'next/server';
import { db } from '@/db/db';

export async function POST(req: Request, props: { params: Promise<{ vid: number, id: number }> }) {
    const params = await props.params;
    const data = await req.json()


    try {
        const vendorProgress = await db.query.vendorLevels.findFirst({
            where: (vendorLevels, { eq }) => eq(vendorLevels.vendorId, params.vid),
            with: {
                badges: true,
            }
        });


        return NextResponse.json({ message: "Success" }, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}