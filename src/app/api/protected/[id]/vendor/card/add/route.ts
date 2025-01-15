
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { getStripe } from '@/libs/server-utils';

export async function POST(req: Request) {
    const session = await auth();
    const data = await req.json()

    try {
        const stripe = getStripe()
        const paymentMethod = await stripe.paymentMethods.create({
            type: 'card',
            card: {
                token: data.token,
            },
            billing_details: {
                name: data.name,
                address: data.address,
            },
        });
        const res = await stripe.paymentMethods.attach(
            paymentMethod.id,
            {
                customer: data.customerId,
            }
        );
        return NextResponse.json({ message: "Success" }, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}