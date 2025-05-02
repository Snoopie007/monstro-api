
import { NextRequest, NextResponse } from 'next/server';
import { VendorStripePayments } from '@/libs/server/stripe';
import { auth } from '@/auth';

export async function GET(req: NextRequest) {
    const session = await auth();

    try {

        if (!session || !session.user.stripeCustomerId) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
        }

        const stripe = new VendorStripePayments();

        const paymentMethods = await stripe.getPaymentMethods(session.user.stripeCustomerId);

        return NextResponse.json(paymentMethods.data, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }

}