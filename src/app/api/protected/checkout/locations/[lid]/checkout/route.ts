import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { locationState, vendors } from "@/db/schemas";
import { VendorStripePayments } from "@/libs/server/stripe";
import { eq } from "drizzle-orm";
import { getPlan } from "../../../utils";
import { auth } from "@/auth";

const stripe = new VendorStripePayments();

export async function POST(
	req: NextRequest,
	props: { params: Promise<{ lid: string }> }
) {
	const data = await req.json();
	const { token, state } = data;

	const session = await auth();
	if (!session || !session.user) {
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
		const vendor = await db.query.vendors.findFirst({
			where: (vendor, { eq }) => eq(vendor.id, vendorId),
		});

		if (!vendor) {
			throw new Error("Vendor not found");
		}

		const metadata = { vendorId, locationId: lid };

		const customer = await stripe.createCustomer({
			firstName: vendor.firstName,
			lastName: vendor.lastName!,
			email: vendor.email!,
			phone: vendor.phone!,
		}, token.id, {
			vendorId,
			locations: [lid],
		});

		const today = new Date();

		if (plan.id === 1) {
			await stripe.createPaymentIntent(100, token.card.id, {
				authorizeOnly: true,
				metadata
			})
		} else {
			await Promise.all([
				stripe.createSubscription(plan, metadata, 0),
				stripe.createGHLSubscription(metadata),
			]);
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
					lastRenewalDate: today,
					updated: today,
				})
				.where(eq(locationState.locationId, lid));

			await tx.update(vendors).set({
				stripeCustomerId: customer.id,
				updated: today,
			}).where(eq(vendors.id, vendorId));
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: (err as Error).message ?? err }, { status: 500 });
	}
}