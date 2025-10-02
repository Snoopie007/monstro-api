import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/db";
import { locations, locationState, vendors } from "@/db/schemas";
import { VendorStripePayments } from "@/libs/server/stripe";

import { eq } from "drizzle-orm";
import { MonstroPlan } from "@/types/admin";
import { PackagePaymentPlan } from "@/types/admin";
import { chargeWallet, getPlan, getPaymentPlan } from "../../../utils";
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
		let paymentPlan: PackagePaymentPlan | null = null;

		if (state.pkgId) {
			paymentPlan = await getPaymentPlan(state.paymentPlanId, state.pkgId);
		}

		let plan: MonstroPlan | null = null;
		if (state.planId) {
			plan = await getPlan(state.planId);
		}

		const vendor = await db.query.vendors.findFirst({
			where: (vendor, { eq }) => eq(vendor.id, vendorId),
		});

		if (!vendor) {
			throw new Error("Vendor not found");
		}
		const customer = await stripe.createCustomer(
			{
				firstName: vendor.firstName,
				lastName: vendor.lastName!,
				email: vendor.email!,
				phone: vendor.phone!,
			},
			token.id,
			{ vendorId }
		);

		await chargeWallet(stripe, lid, token.card.id);

		const metadata = { vendorId, locationId: lid };

		if (paymentPlan) {
			const downPayment =
				Number(paymentPlan.downPayment - paymentPlan.discount) * 100;
			if (paymentPlan.downPayment > 0) {
				await stripe.createPaymentIntent(downPayment, token.card.id, {
					metadata,
				});
			}
			if (paymentPlan.monthlyPayment > 0 && paymentPlan.priceId) {
				await stripe.createPaymentPlan(paymentPlan, undefined, metadata);
			}
			await Promise.all([
				stripe.createPackageSubscriptions(metadata),
				stripe.createGHLSubscription(metadata),
			]);
		}

		if (plan && plan.id !== 1) {
			await stripe.createSubscription(plan, metadata, 0);
		}

		const today = new Date();
		await db.transaction(async (tx) => {
			await tx
				.update(locations)
				.set({
					updated: today,
				})
				.where(eq(locations.id, lid));

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

			await tx
				.update(vendors)
				.set({
					stripeCustomerId: customer.id,
					updated: today,
				})
				.where(eq(vendors.id, vendorId));
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
