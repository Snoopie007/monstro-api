import { auth } from "@/auth";
import { db } from "@/db/db";
import { memberLocations } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";
import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request, props: { params: Promise<{ id: number, mid: number }> }) {
    const params = await props.params;
    const session = await auth();
    const { token, member, default: isDefault } = await req.json();

    try {
        if (session) {
            const integrations = await db.query.integrations.findFirst({
                where: (integration, { eq }) => (and(eq(integration.locationId, params.id), eq(integration.service, "stripe"))),
                columns: {
                    accessToken: true,
                    secretKey: true
                }
            })

            if (!integrations || !integrations.secretKey) {
                return NextResponse.json({ error: "Stripe integration not found" }, { status: 404 })
            }
            const memberLocation = await db.query.memberLocations.findFirst({
                where: (memberLocation, { eq, and }) => and(eq(memberLocation.memberId, params.mid), eq(memberLocation.locationId, params.id))
            })

            if (!memberLocation) {
                return NextResponse.json({ error: "Member location not found" }, { status: 404 })
            }


            const stripe = new MemberStripePayments(integrations?.secretKey);
            if (!memberLocation.stripeCustomerId) {
                const customer = await stripe.createCustomer(member, token, {
                    locationId: params.id,
                    memberId: params.mid
                });
                memberLocation.stripeCustomerId = customer.id;

                await db.update(memberLocations).set({ stripeCustomerId: customer.id, updated: new Date() })
                    .where(and(eq(memberLocations.locationId, params.id), eq(memberLocations.memberId, params.mid)))
            }

            stripe.setCustomer(memberLocation.stripeCustomerId);
            const { paymentMethod } = await stripe.setupIntent(token);
            if (isDefault) {
                await stripe.updateCustomer(memberLocation.stripeCustomerId, {
                    invoice_settings: {
                        default_payment_method: paymentMethod?.id
                    }
                })
            }
            return NextResponse.json(paymentMethod, { status: 200 });
        } else {
            return NextResponse.json({ error: "Something Went Wrong" }, { status: 500 })
        }

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