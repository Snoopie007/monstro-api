import { db } from "@/db/db";

import { StripePayments } from "./stripe-sdk";
import { NextRequest, NextResponse } from "next/server";
import { locations, users, vendors } from "@/db/schemas";

const stripe = new StripePayments();

export async function POST(req: NextRequest) {

    const { vendor, userSelection, token, rep } = await req.json();
    const initialCharge = Number(userSelection.paymentPlan.downPayment - userSelection.paymentPlan.discount) * 100;
    // const planName = plan.name.toLocaleLowerCase();

    try {
        const user = await db.query.users.findFirst({
            where: (user, { eq }) => eq(user.email, data.email)
        })
        if (user) {
            return NextResponse.json({ error: "User already exists" }, { status: 400 })
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword: string = await bcrypt.hash(data.password, salt);
        const userId = await db.transaction(async (tx) => {
            const [user] = await tx.insert(users).values({
                email: data.email,
                password: hashedPassword,
                name: data.email
            }).returning()

            const [{ vendorId }] = await tx.insert(vendors).values({
                userId: user.id,

                email: data.email,
                firstName: '',
                lastName: '',
                phone: '',
            }).returning({ vendorId: vendors.id })

            await tx.insert(locations).values({
                vendorId,
                status: 'Pending',
            })
            return { ...user, vendorId }

        })


        const customer = await stripe.createCustomer(vendor, token.id, id);

        const { clientSecret } = await stripe.createPaymentIntent(
            initialCharge,
            customer.id,
            token.card.id,
            true
        );

        await stripe.createPaymentPlan(userSelection.paymentPlan.priceId, customer.id, userSelection.paymentPlan.trial);
        await stripe.createSubscription(customer.id);
        if (clientSecret) {


            // (Password sent via email)


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

