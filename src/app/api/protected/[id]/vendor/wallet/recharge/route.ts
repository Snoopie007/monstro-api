
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db/db';
import { StripePayments } from '@/libs/server/stripe';
import { auth } from '@/auth';
import { eq, sql } from 'drizzle-orm';
import { wallet } from '@/db/schemas';

export async function POST(req: NextRequest, props: { params: Promise<{ id: number }> }) {

    const params = await props.params;
    const body = await req.json();

    const { amount, id } = body;

    const stripe = new StripePayments();
    const session = await auth();
    if (!session) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    try {

        const walletPayment = amount * 100;
        const { clientSecret } = await stripe.createPaymentIntent(
            walletPayment,
            session?.user.stripeCustomerId,
            undefined,
            { description: `Manual-charge USD ${walletPayment / 100} was successfully added to wallet.` }
        );

        if (!clientSecret) {
            return NextResponse.json({ error: "Payment failed" }, { status: 400 })
        }

        await db.update(wallet).set({
            balance: sql`${wallet.balance} + ${amount}`,
            lastCharged: new Date(),
            updated: new Date()
        }).where(eq(wallet.id, id))

        return NextResponse.json({ success: true }, { status: 200 })
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}
