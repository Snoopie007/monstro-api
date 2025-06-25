import { auth } from "@/auth";
import { db } from "@/db/db";
import { members } from "@/db/schemas";
import { encodeId } from "@/libs/server/sqids";
import { MemberStripePayments } from "@/libs/server/stripe";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;

    const { token, member, address, ...data } = await req.json();

    try {

        const member = await db.query.members.findFirst({
            where: (member, { eq }) => eq(member.id, params.mid)
        })

        if (!member) {
            return NextResponse.json({ error: "Member location not found" }, { status: 404 })
        }

        let isDefault = data.default;
        const stripe = new MemberStripePayments();
        if (!member.stripeCustomerId) {
            const customer = await stripe.createCustomer({
                firstName: member.firstName,
                lastName: member.lastName,
                email: member.email,
                phone: member.phone,
                address
            }, undefined, {
                locationId: encodeId(params.id),
                memberId: params.mid
            });

            member.stripeCustomerId = customer.id;
            isDefault = true;
            await db.update(members).set({ stripeCustomerId: customer.id, updated: new Date() })
                .where(eq(members.id, params.mid))
        }
        stripe.setCustomer(member.stripeCustomerId)
        console.log(token)
        const { paymentMethod } = await stripe.setupIntent(token);
        if (isDefault) {
            await stripe.updateCustomer({
                invoice_settings: {
                    default_payment_method: paymentMethod?.id
                }
            })
        }
        return NextResponse.json(paymentMethod, { status: 200 });

    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}


export async function PUT(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json();
    try {

        if (session) {
            const integrations = await db.query.integrations.findFirst({
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "stripe"))),
                columns: {
                    accessToken: true
                }
            })


            let paymentMethod: any;
            if (integrations?.accessToken) {
                const stripe = require('stripe')(integrations?.accessToken);
                paymentMethod = await stripe.customers.update(
                    data.customerId,
                    {
                        invoice_settings: {
                            default_payment_method: data.paymentMethodId
                        }
                    }
                );
            } else {

                return NextResponse.json({ error: "Something Went Wrong" }, { status: 500 })
            }
            return NextResponse.json({ message: "Success", data: paymentMethod.data }, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}

export async function DELETE(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const session = await auth();
    const { searchParams } = new URL(req.url);
    const paymentMethodId = searchParams.get('paymentMethodId');
    try {
        if (!paymentMethodId) {
            return NextResponse.json({ error: "Payment Method Id is required" }, { status: 400 })
        }
        if (session) {
            const integrations = await db.query.integrations.findFirst({
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "stripe"))),
                columns: {
                    accessToken: true
                }
            })
            let paymentMethod: any;
            if (integrations?.accessToken) {
                const stripe = require('stripe')(integrations?.accessToken);
                paymentMethod = await stripe.paymentMethods.detach(
                    paymentMethodId
                );
            } else {
                return NextResponse.json({ error: "Something Went Wrong" }, { status: 500 })
            }
            return NextResponse.json({ message: "Success", data: paymentMethod.data }, { status: 200 });
        }
    } catch (err) {
        console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}