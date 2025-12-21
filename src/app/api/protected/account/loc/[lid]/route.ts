import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { locationState, vendors } from "@/db/schemas";
import { VendorStripePayments } from "@/libs/server/stripe";
import { eq } from "drizzle-orm";
import { getPlan } from "../../utils";
import { authWithContext } from '@/libs/auth/server';

const stripe = new VendorStripePayments();

export async function POST(
	req: NextRequest,
	props: { params: Promise<{ lid: string }> }
) {
	const data = await req.json();
	const { token, state } = data;

	const session = await authWithContext();
	if (!session || !session.user) {
		return NextResponse.json({ error: "Account not found" }, { status: 404 });
	}

	const params = await props.params;
	const lid = params.lid;
	const vendorId = session.user.vendorId;

	try {

		const plan = await getPlan(state.planId);
		if (!plan) {
			return NextResponse.json({ error: "Plan not found" }, { status: 404 });
		}
		const vendor = await db.query.vendors.findFirst({
			where: (vendor, { eq }) => eq(vendor.id, vendorId),
		});

		if (!vendor) {
			return NextResponse.json({ error: "Account not found" }, { status: 404 });
		}

		const metadata = { vendorId, locationId: lid };

		const customer = await stripe.createCustomer({
			firstName: vendor.firstName,
			lastName: vendor.lastName!,
			email: vendor.email!,
			phone: vendor.phone!,
		}, token.id, {
			vendorId,
			locations: lid,
		});

		const today = new Date();

		let stripeSubscriptionId: string | undefined;
		if (plan.id === 1) {
			await stripe.createPaymentIntent(100, token.card.id, {
				authorizeOnly: true,
				metadata
			})
		} else {
			const [sub, _] = await Promise.all([
				stripe.createSubscription(plan, metadata, 0),
				stripe.createGHLSubscription(metadata),
			]);
			stripeSubscriptionId = sub.id;
		}

		await db.transaction(async (tx) => {
			const { created, ...rest } = state;
			await tx
				.update(locationState)
				.set({
					...rest,
					status: "active",
					usagePercent: plan?.usagePercent,
					startDate: today,
					stripeSubscriptionId,
					lastRenewalDate: today,
					updated: today,
				})
				.where(eq(locationState.locationId, lid));

			await tx.update(vendors).set({
				stripeCustomerId: customer.id,
				updated: today,
			}).where(eq(vendors.id, vendorId));
		});
		try {
			await fetch(`${process.env.NEXT_PUBLIC_MONSTRO_API_URL}/api/public/signup`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Authorization': `Bearer 4087c1d6-5bb9-47a5-8598-c2a0868c6a78`
				},
				body: JSON.stringify({
					email: vendor.email!,
					firstName: vendor.firstName,
					lastName: vendor.lastName!,
					phone: vendor.phone!,
					lid: lid,
				})
			})
		} catch (error) {
			console.log(error);
		}
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: (err as Error).message ?? err }, { status: 500 });
	}
}