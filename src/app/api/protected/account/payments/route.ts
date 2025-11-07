
import { NextRequest, NextResponse } from 'next/server';
import { VendorStripePayments } from '@/libs/server/stripe';
import { authWithContext } from '@/libs/auth/server';

export async function GET(req: NextRequest) {
    const session = await authWithContext();

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

export async function PATCH(req: NextRequest) {
    const session = await authWithContext();
    const { paymentMethodId, customerId } = await req.json();
    try {
        if (!session || !session.user.stripeCustomerId) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
        }
        const stripe = new VendorStripePayments();
        stripe.setCustomer(customerId);
        await stripe.updateCustomer({
            invoice_settings: {
                default_payment_method: paymentMethodId
            }
        });
        return NextResponse.json({ message: "Payment method set as default" }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function DELETE(req: NextRequest) {
    const session = await authWithContext();

    try {
        if (!session || !session.user.stripeCustomerId) {
            return NextResponse.json({ error: "Vendor not found" }, { status: 404 })
        }
        const stripe = new VendorStripePayments();
        const { searchParams } = new URL(req.url);
        const paymentMethodId = searchParams.get('paymentMethodId');
        if (!paymentMethodId) {
            return NextResponse.json({ error: "Payment method id is required" }, { status: 400 })
        }
        await stripe.detachPaymentMethod(paymentMethodId);
        return NextResponse.json({ message: "Payment method deleted" }, { status: 200 });
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}