import { db } from "@/db/db";

import { StripePayments } from "./stripe-sdk";
import { NextRequest, NextResponse } from "next/server";

const stripe = new StripePayments();

export async function POST(req: NextRequest) {

    const { vendor, userSelection, token, rep } = await req.json();
    const initialCharge = Number(userSelection.paymentPlan.downPayment - userSelection.paymentPlan.discount) * 100;
    // const planName = plan.name.toLocaleLowerCase();

    try {
        const customer = await stripe.createCustomer(vendor, token.id);
        const { clientSecret } = await stripe.createPaymentIntent(
            initialCharge,
            customer.id,
            token.card.id,
            true
        );

        await stripe.createPaymentPlan(userSelection.paymentPlan.priceId, customer.id, userSelection.paymentPlan.trial);
        await stripe.createSubscription(customer.id);
        if (clientSecret) {



            // const res = await fetch(`${process.env.GHL_URL}/contacts/`, {
            //     method: "POST",
            //     headers: {
            //         'Content-type': 'application/json',
            //         "Authorization": `Bearer ${process.env.GHL_KEY}`,
            //     },
            //     body: JSON.stringify({
            //         firstName: vendor.firstName,
            //         lastName: vendor.lastName,
            //         phone: vendor.phone,
            //         email: vendor.email,
            //         source: "Website Form",
            //         tags: ["Customer"],
            //         locationId: "rCcWpfkx9wZlMF7P4C5V",
            //         customFields: [
            //             { key: "sales_rep", field_value: rep },
            //             { key: "plan_type", field_value: plan.name }
            //         ]
            //     })
            // });
        }

        return NextResponse.json({ locationId: 1 }, { status: 200 });
        // } else {
        //     return new Response("No owners found", {
        //         status: 500,
        //     });
        // }
    } catch (error) {
        console.log(error);
        return new Response("No owners found", {
            status: 500,
        });
    }
}

