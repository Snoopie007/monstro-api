import { auth } from "@/libs/auth/server";
import { VendorStripePayments } from "@/libs/server/stripe";
import { NextRequest, NextResponse } from "next/server";
import { getPlan } from "../../../utils";
import { locationState } from "@subtrees/schemas";
import { db } from "@/db/db";
import { eq } from "drizzle-orm";

const stripe = new VendorStripePayments();
export async function POST(req: NextRequest, props: { params: Promise<{ lid: string }> }) {
    const { lid } = await props.params;
    const { planId } = await req.json();

    const today = new Date();
    if (!planId) {
        return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    const session = await auth();
    if (!session || !session.user.stripeCustomerId) {
        return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
    }



    try {

        const ls = await db.query.locationState.findFirst({
            where: (locationState, { eq }) => eq(locationState.locationId, lid),
        });

        if (!ls) {
            return NextResponse.json({ error: "Location not found" }, { status: 404 });
        }



        const plan = await getPlan(planId);
        if (!plan) {
            return NextResponse.json({ error: "Plan not found" }, { status: 404 });
        }
        stripe.setCustomer(session.user.stripeCustomerId);

        const metadata = { vendorId: session.user.vendorId, locationId: lid };


		let stripeSubscriptionId: string | null = null;
		const currentSubscriptionId = (ls.settings as { stripeSubscriptionId?: string } | null)?.stripeSubscriptionId ?? null;
		if (ls.planId === 1) {
            // just upgrade the subscription
            const results = await Promise.all([
                stripe.createSubscription(plan, metadata, 0),
                stripe.createGHLSubscription(metadata),
            ]);
            stripeSubscriptionId = results[0].id;
        } else {

			if (planId === 1) {
				if (currentSubscriptionId) {
					// cancel ghl subscription
					await stripe.cancelSubscription(currentSubscriptionId);
				}
			} else {
				if (!currentSubscriptionId) {
					const results = await Promise.all([
						stripe.createSubscription(plan, metadata, 0),
						stripe.createGHLSubscription(metadata),
					]);
					stripeSubscriptionId = results[0].id;
				} else {
					stripeSubscriptionId = currentSubscriptionId;
					const current = await stripe.getSubscription(currentSubscriptionId);
					if (!current) {
						return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
					}
					const previousId = current.items.data[0].id;
					await stripe.upgradeSubscription(currentSubscriptionId, previousId, plan);
				}
			}
		}

		const updates = {
			planId: planId,
			settings: {
				...(ls.settings || {}),
				...(stripeSubscriptionId ? { stripeSubscriptionId } : {}),
			},
			usagePercent: plan?.usagePercent,
			lastRenewalDate: today,
			updated: today,
		}
        // update the location state
        await db.update(locationState)
            .set(updates).where(eq(locationState.locationId, lid));


        // return the updated location state
        return NextResponse.json({ success: true }, { status: 200 });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: "Failed to upgrade plan" }, { status: 500 });
    }
}   
