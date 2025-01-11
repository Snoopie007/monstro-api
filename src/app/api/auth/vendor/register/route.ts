import { db } from "@/db/db";

import { StripePayments } from "@/libs/stripe-sdk";
import { NextRequest, NextResponse } from "next/server";

const stripe = new StripePayments();

export async function POST(req: NextRequest) {

    const { vendor, launcher, plan, token, rep } = await req.json();

    const initialCharge = Number(launcher.price) * 100;

    const planName = plan.name.toLocaleLowerCase();

    try {
        const customer = await stripe.createCustomer(vendor, token.id);
        const { clientSecret } = await stripe.createPaymentIntent(
            initialCharge,
            customer.id,
            token.card.id,
            true
        );

        await stripe.createSubscription({ ...plan, trial: launcher.duration }, customer.id);
        if (clientSecret) {


            // const id = await db.transaction(async (tx) => {
            //     const [{ ownerId }] = await tx
            //         .insert(owners)
            //         .values(newOwner)
            //         .onConflictDoUpdate({ target: owners.email, set: newOwner })
            //         .returning({ ownerId: owners.id });
            //     const steps = [];


            //     const progressSteps = [1, 2, 3];

            //     for (let i of progressSteps) {
            //         steps.push({
            //             ownerId: +ownerId,
            //             progressStepId: i,
            //             active: i === 1,
            //         });
            //     }
            //     await tx.insert(vendorProgress).values(steps);
            //     return ownerId;
            // });

            const res = await fetch(`${process.env.GHL_URL}/contacts/`, {
                method: "POST",
                headers: {
                    'Content-type': 'application/json',
                    "Authorization": `Bearer ${process.env.GHL_KEY}`,
                },
                body: JSON.stringify({
                    firstName: vendor.firstName,
                    lastName: vendor.lastName,
                    phone: vendor.phone,
                    email: vendor.email,
                    source: "Website Form",
                    tags: ["Customer"],
                    locationId: "rCcWpfkx9wZlMF7P4C5V",
                    customFields: [
                        { key: "sales_rep", field_value: rep },
                        { key: "plan_type", field_value: plan.name }
                    ]
                })
            });


            return NextResponse.json({ ownerID: id }, { status: 200 });
        } else {
            return new Response("No owners found", {
                status: 500,
            });
        }
    } catch (error) {
        console.log(error);
        return new Response("No owners found", {
            status: 500,
        });
    }
}
