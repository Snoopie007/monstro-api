
import { NextResponse } from 'next/server';
import { transactions } from '@/db/schemas';
import { db } from '@/db/db';
import { StripePayments } from '@/libs/server/stripe';
import { Plan } from '@/types';
import { encodeId } from '@/libs/server/sqids';

//TODO: double check everything is working

export async function POST(req: Request, props: { params: Promise<{ id: number, model: string }> }) {
	const params = await props.params;
	const data = await req.json()

	try {
		let newTransaction = {
			...data,
			model: params.model,
			locationId: params.id,
			paymentType: 'one-time'
		}

		let plan: Plan | undefined = undefined;
		if (data.chargeFor === 'Program') {
			plan = await db.query.memberPlans.findFirst({
				where: (memberPlans, { eq }) => eq(memberPlans.id, data.planId),
				with: {
					pricing: true
				}
			})
			newTransaction = {
				...newTransaction,
				amount: plan?.pricing.amount,
				paymentType: plan?.pricing.billingPeriod === 'One Time' ? 'one-time' : 'recurring'
			}
		}

		if (data.paymentMethod === 'stripe') {
			const stripeIntegration = await db.query.integrations.findFirst({
				where: (integration, { eq, and }) => and(eq(integration.locationId, params.id), eq(integration.service, "Stripe"))
			})

			if (!stripeIntegration || !stripeIntegration.secretKey) {
				return NextResponse.json({ error: "Stripe integration not found" }, { status: 404 })
			}

			const stripe = new StripePayments(stripeIntegration.secretKey);

			const customer = await stripe.getCustomer(data.customerId);
			if (!customer) {
				return NextResponse.json({ error: "Customer not found" }, { status: 404 })
			}
			if (plan && data.planId) {
				if (newTransaction.paymentType === 'recurring') {
					await stripe.createMemberSubscription(
						plan?.pricing?.stripePriceId, customer.id,
						data.memberId, encodeId(params.id)
					);
				} else {
					await stripe.createMemberPaymentIntent(plan.pricing.amount * 100, customer.id, undefined);
				}
			} else {
				await stripe.createPaymentIntent(newTransaction.amount * 100, customer.id, undefined);
			}


			newTransaction = {
				...newTransaction,
			}
		}

		const transaction = await db.insert(transactions).values(newTransaction).returning({ id: transactions.id });

		return NextResponse.json(transaction, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}