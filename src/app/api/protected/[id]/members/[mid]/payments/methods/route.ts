import { auth } from "@/auth";
import { db } from "@/db/db";
import { getStripe } from "@/libs/server-utils";
import { and } from "drizzle-orm";
import { NextResponse } from "next/server";
import Stripe from "stripe";

export async function POST(req: Request, props: { params: Promise<{ id: number }> }) {
    const params = await props.params;
    const session = await auth();
    const data = await req.json();
    try {

        if (session) {
            const integrations = await db.query.integrations.findFirst({
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "Stripe"))),
                columns: {
                    accessToken: true
                }
            })

            if (integrations?.accessToken) {
                const stripe = getStripe(integrations?.accessToken);
                const member = await db.query.members.findFirst({
                    where: (members, { eq }) => eq(members.id, data.mid),

                });
                const customers = await stripe.customers.list({
                    email: member?.email,
                    limit: 1,
                });
                let customer = customers.data.length ? customers.data[0] : null;
                if (!member) {
                    return NextResponse.json({ error: "Something Went Wrong" }, { status: 500 })
                }

                if (!customer) {
                    customer = await stripe.customers.create({
                        name: member.firstName + ' ' + member.lastName,
                        email: member.email,
                        phone: `${member.phone}`
                    });
                }

                const paymentMethod = await stripe.paymentMethods.create(
                    {
                        type: "card",
                        card: {
                            token: data.token
                        }
                    }
                );
                if (paymentMethod) {
                    await stripe.paymentMethods.attach(
                        paymentMethod.id,
                        {
                            customer: customer.id,
                        }
                    );
                }
                return NextResponse.json(paymentMethod, { status: 200 });
            } else {
                return NextResponse.json({ error: "Something Went Wrong" }, { status: 500 })
            }

        }
    } catch (err) {
        // console.log(err)
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
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "Stripe"))),
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
        // console.log(err)
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
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "Stripe"))),
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
        // console.log(err)
        return NextResponse.json({ error: err }, { status: 500 })
    }
}