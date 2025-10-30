
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { VendorStripePayments } from '@/libs/server/stripe';


const stripe = new VendorStripePayments()
export async function POST(req: Request) {

    const data = await req.json()

    try {

        await stripe.setupIntent(data.token, data.customerId);

        return NextResponse.json({ message: "Success" }, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}