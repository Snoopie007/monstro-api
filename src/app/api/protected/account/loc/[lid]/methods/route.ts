import { NextResponse } from "next/server";

import { VendorStripePayments } from "@/libs/server/stripe";

import { eq } from "drizzle-orm";
import { getPlan } from "../../../utils";
import { auth } from "@/libs/auth/server";
import { locations, locationState } from "@/db/schemas/locations";
import { db } from "@/db/db";

export async function POST(
	req: Request,
	props: { params: Promise<{ lid: string }> }
) {
	const data = await req.json();
	const { paymentMethodId, state } = data;

	const session = await auth();
	if (!session || !session.user.stripeCustomerId) {
		return NextResponse.json({ error: "Vendor not found" }, { status: 404 });
	}

	const params = await props.params;
	const lid = params.lid;
	const vendorId = session.user.vendorId;

	try {

		const plan = await getPlan(state.planId);
		if (!plan) {
			return NextResponse.json({ error: "Plan not found" }, { status: 404 });
		}
		const stripe = new VendorStripePayments();
		stripe.setCustomer(session.user.stripeCustomerId);

		const metadata = { vendorId, locationId: lid };


		if (plan.id === 1) {
			await stripe.createPaymentIntent(100, paymentMethodId, {
				authorizeOnly: true,
				metadata
			})
		} else {
			await Promise.all([
				stripe.createSubscription(plan, metadata, 0, paymentMethodId),
				stripe.createGHLSubscription(metadata, paymentMethodId),
			]);
		}

		const today = new Date();
		await db.transaction(async (tx) => {
			await tx.update(locations).set({ updated: today }).where(eq(locations.id, lid));

			const { created, ...rest } = state;
			await tx.update(locationState).set({
				...rest,
				status: "active",
				usagePercent: plan?.usagePercent,
				startDate: today,
				lastRenewalDate: today,
				updated: today,
			}).where(eq(locationState.locationId, lid));
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
