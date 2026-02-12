import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { locationState, vendors } from "@subtrees/schemas";
import { VendorStripePayments } from "@/libs/server/stripe";
import { eq } from "drizzle-orm";
import { getPlan, notifyAdminAPI } from "../../utils";
import { auth } from '@/libs/auth/server';
import Stripe from "stripe";

const stripe = new VendorStripePayments();

export async function POST(
	req: NextRequest,
	props: { params: Promise<{ lid: string }> }
) {
	const data = await req.json();
	const { token, state } = data;

	const session = await auth();
	if (!session || !session.user) {
		return NextResponse.json({ error: "Account not found" }, { status: 404 });
	}

	const params = await props.params;
	const lid = params.lid;
	let vendorId: string;
	if (session.user.role === 'vendor') {
		vendorId = session.user.vendorId!;
	} else if (session.user.role === 'staff') {
		vendorId = session.user.staffId!;
	} else {
		return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
	}

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

		let stripeSubscription: Stripe.Subscription | undefined;
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
			stripeSubscription = sub;
		}

		await db.transaction(async (tx) => {
			const { created, ...rest } = state;
			await tx
				.update(locationState)
				.set({
					...rest,
					status: stripeSubscription?.status || 'incomplete',
					usagePercent: plan?.usagePercent,
					startDate: today,
					stripeSubscriptionId: stripeSubscription?.id,
					lastRenewalDate: today,
					updated: today,
				})
				.where(eq(locationState.locationId, lid));

			await tx.update(vendors).set({
				stripeCustomerId: customer.id,
				updated: today,
			}).where(eq(vendors.id, vendorId));
		});


		notifyAdminAPI({
			email: vendor.email!,
			firstName: vendor.firstName,
			lastName: vendor.lastName!,
			phone: vendor.phone!,
		}, lid).catch(error => {
			console.error('Failed to notify external API:', error);
			// Could also send to error tracking service (Sentry, etc.)
		});
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: (err as Error).message ?? err }, { status: 500 });
	}
}