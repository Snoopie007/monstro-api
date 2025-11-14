
import { db } from "@/db/db";
import { NextRequest, NextResponse } from "next/server";

import { MemberStripePayments } from "@/libs/server/stripe";
import { memberPaymentMethods } from "@/db/schemas";
import { and, eq } from "drizzle-orm";
type Props = {
    params: Promise<{ id: string; mid: string; pmid: string }>
}

export async function PATCH(
    req: Request,
    props: Props
) {
    const { id, mid, pmid } = await props.params;
    const { currentDefaultId } = await req.json();
    try {

        const mpm = await db.query.memberPaymentMethods.findFirst({
            where: (memberPaymentMethods, { eq, and }) => and(
                eq(memberPaymentMethods.paymentMethodId, pmid),
                eq(memberPaymentMethods.memberId, mid),
                eq(memberPaymentMethods.locationId, id)
            ),
            with: {
                member: true,
                paymentMethod: true,
            },
        });

        if (mpm && mpm.isDefault) {
            return NextResponse.json({ error: "Payment method is already the default" }, { status: 400 });
        }
        const integrations = await db.query.integrations.findFirst({
            where: (integration, { eq }) =>
                and(
                    eq(integration.locationId, id),
                    eq(integration.service, "stripe")
                )
        });
        if (!integrations || !integrations.accountId) {
            return NextResponse.json({ error: "Integration not found" }, { status: 404 });
        }

        if (!mpm?.member?.stripeCustomerId) {
            return NextResponse.json({ error: "Member does not have a Stripe customer ID" }, { status: 404 });
        }
        // Set the new payment method as default
        await db.update(memberPaymentMethods).set({
            isDefault: true,
        }).where(and(
            eq(memberPaymentMethods.paymentMethodId, pmid),
            eq(memberPaymentMethods.memberId, mid),
            eq(memberPaymentMethods.locationId, id)
        ));
        // Set the previous default payment method as not default
        await db.update(memberPaymentMethods).set({
            isDefault: false,
        }).where(and(
            eq(memberPaymentMethods.paymentMethodId, currentDefaultId),
            eq(memberPaymentMethods.memberId, mid),
            eq(memberPaymentMethods.locationId, id)
        ));

        const stripe = new MemberStripePayments(integrations?.accountId);
        stripe.setCustomer(mpm.member.stripeCustomerId);
        await stripe.updateCustomer({
            invoice_settings: {
                default_payment_method: mpm.paymentMethod.stripeId,
            },
        });
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
export async function DELETE(req: NextRequest, props: Props
) {
    const { id, mid, pmid } = await props.params;
    try {

        await db.delete(memberPaymentMethods).where(and(
            eq(memberPaymentMethods.paymentMethodId, pmid),
            eq(memberPaymentMethods.memberId, mid),
            eq(memberPaymentMethods.locationId, id)
        ));
        return NextResponse.json(
            { success: true },
            { status: 200 }
        );
    } catch (err) {
        console.log(err);
        return NextResponse.json({ error: err }, { status: 500 });
    }
}
