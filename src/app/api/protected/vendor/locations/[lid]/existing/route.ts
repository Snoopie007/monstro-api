import { NextResponse } from "next/server";

import { VendorStripePayments } from "@/libs/server/stripe";

import { eq } from "drizzle-orm";
import { MonstroPlan } from "@/types/admin";
import { PackagePaymentPlan } from "@/types/admin";
import { chargeWallet, getPlan, getPaymentPlan } from "../../../utils";
import { auth } from "@/auth";
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
		let paymentPlan: PackagePaymentPlan | null = null;

		if (state.pkgId) {
			paymentPlan = await getPaymentPlan(state.paymentPlanId, state.pkgId);
		}

		let plan: MonstroPlan | null = null;
		if (state.planId) {
			plan = await getPlan(state.planId);
		}

		const stripe = new VendorStripePayments();
		stripe.setCustomer(session.user.stripeCustomerId);

		await chargeWallet(stripe, lid, paymentMethodId);

		const metadata = { vendorId, locationId: lid };

		if (paymentPlan) {
			const downPayment = Number(paymentPlan.downPayment - paymentPlan.discount) * 100;
			if (paymentPlan.downPayment > 0) {
				console.log("downPayment", downPayment);
				await stripe.createPaymentIntent(downPayment, paymentMethodId, {
					metadata,
				});
			}
			if (paymentPlan.monthlyPayment > 0 && paymentPlan.priceId) {
				await stripe.createPaymentPlan(
					paymentPlan,
					undefined,
					metadata,
					paymentMethodId
				);
			}
			await Promise.all([
				stripe.createPackageSubscriptions(metadata, paymentMethodId),
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
		});

		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
