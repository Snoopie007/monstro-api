import { db } from "@/db/db";
import { memberPackages, transactions } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/server/stripe";

import { NextRequest, NextResponse } from "next/server";
import { calculatePeriodEnd, calculateStripeFeeAmount, calculateTax } from "../../utils";
import { PaymentType } from "@/types";

type Props = {
	params: Promise<{
		id: string;
		mid: string;
	}>
};

export async function GET(req: NextRequest, props: Props) {
	const { id, mid } = await props.params;

	try {
		const packages = await db.query.memberPackages.findMany({
			where: (memberPackage, { eq, and }) =>
				and(
					eq(memberPackage.memberId, mid),
					eq(memberPackage.locationId, id)
				),
			with: {
				plan: true,
			},
		});

		return NextResponse.json(packages, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function POST(req: NextRequest, props: Props) {

	const { id, mid } = await props.params;
	const body = await req.json();

	const { paymentMethod, paymentType, trialDays, ...data } = body;
	try {
		const plan = await db.query.memberPlans.findFirst({
			where: (memberPlan, { eq }) => eq(memberPlan.id, data.memberPlanId)
		})

		if (!plan) {
			throw new Error("Plan not found")
		}

		const ml = await db.query.memberLocations.findFirst({
			where: (memberLocation, { eq, and }) => and(
				eq(memberLocation.memberId, mid),
				eq(memberLocation.locationId, id)
			),
			with: {
				member: true,
				location: {
					with: {
						taxRates: true,
						locationState: true
					}
				}
			}
		});

		if (!ml) {
			throw new Error("No member location found")
		}

		const { location: { taxRates, locationState }, member } = ml;

		if (!member || !member.stripeCustomerId) {
			throw new Error("Member not found");
		}

		const integration = await db.query.integrations.findFirst({
			where: (integration, { eq, and }) => and(
				eq(integration.locationId, id),
				eq(integration.service, "stripe")
			),
			columns: {
				accountId: true,
			},
		});

		if (!integration) {
			throw new Error("Integration not found");
		}

		const stripe = new MemberStripePayments(integration.accountId)
		stripe.setCustomer(member.stripeCustomerId);

		const today = new Date();
		const startDate = data.startDate ? new Date(data.startDate) : today;

		const { expireInterval, expireThreshold } = plan;

		let expireDate: Date | null = null;
		if (data.expireDate) {
			expireDate = new Date(data.expireDate);
		} else if (expireInterval && expireThreshold) {
			expireDate = calculatePeriodEnd(
				startDate,
				expireInterval,
				expireThreshold
			);
		}

		const tax = calculateTax(plan.price, taxRates);
		let subTotal = plan.price;
		let total = subTotal + tax;
		const monstroFee = Math.floor(subTotal * (locationState.usagePercent / 100));
		const stripeFee = calculateStripeFeeAmount((
			locationState.settings.passOnFees ? total : total + monstroFee
		), paymentMethod.type as PaymentType);

		const applicationFeeAmount = monstroFee + stripeFee;



		if (locationState.settings.passOnFees) {
			total += applicationFeeAmount;
			subTotal += applicationFeeAmount;
		}

		const { clientSecret } = await stripe.createPaymentIntent(total, applicationFeeAmount, {
			paymentMethod: paymentMethod.id,
			currency: plan.currency,
			description: `Payment for ${plan.name}`,
			productName: plan.name,
			unitCost: subTotal,
			tax: tax,
			metadata: {
				planId: plan.id,
				startDate: today,
				locationId: id,
				memberId: mid,
			},
		});




		const pkg = await db.transaction(async (tx) => {
			const CommonData = {
				locationId: id,
				memberId: mid,
				paymentType,
			}

			const [pkg] = await tx.insert(memberPackages).values({
				...CommonData,
				stripePaymentId: clientSecret.split("_secret_")[0] || null,
				memberPlanId: plan.id,
				...data,
				status: "active",
				startDate,
				expireDate,
			}).returning();

			/** Create Transaction */
			await tx.insert(transactions).values({
				description: `One time payment for ${plan.name}`,
				...CommonData,
				totalTax: tax,
				type: "inbound",
				items: [{
					productId: plan.id,
					amount: plan.price,
					tax: tax,
					quantity: 1,
				}],
				status: "paid",
				subTotal: plan.price,
				total,
				currency: plan.currency,
				metadata: {
					packageId: pkg.id,
				},
			});
			return pkg;
		});


		return NextResponse.json({ ...pkg, plan }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
