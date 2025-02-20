
import { NextResponse } from 'next/server';
import { auth } from "@/auth";
import { StripePayments } from '@/libs/server/stripe';


const stripe = new StripePayments()
export async function POST(req: Request) {
    const session = await auth();
    const data = await req.json()

    try {

        // const paymentMethod = await stripe.paymentMethods.create({
        //     type: 'card',
        //     card: {
        //         token: data.token,
        //     },
        //     billing_details: {
        //         name: data.name,
        //         address: data.address,
        //     },
        // });
        // const res = await stripe.paymentMethods.attach(
        //     paymentMethod.id, {
        //     customer: data.customerId,
        // });
        const method = await stripe.setupIntent(data.token, data.customerId);

        return NextResponse.json({ message: "Success" }, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}