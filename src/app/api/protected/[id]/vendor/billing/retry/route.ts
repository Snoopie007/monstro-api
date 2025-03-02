
import { NextResponse } from 'next/server';
import { db } from '@/db/db';
import { VendorStripePayments } from '@/libs/server/stripe';

export async function POST(req: Request, props: { params: Promise<{ id: number }> }) {

    const data = await req.json()

    const stripe = new VendorStripePayments()

    try {


        const result = await stripe.retryPayment(data.invoiceId, data.paymentMethod)

        return NextResponse.json({ success: true }, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}