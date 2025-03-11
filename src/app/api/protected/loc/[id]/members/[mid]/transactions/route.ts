import { NextRequest, NextResponse } from 'next/server';

import { db } from '@/db/db';

import { getStripeCustomer } from '@/libs/server/stripe';

import { eq } from 'drizzle-orm';
import { transactions } from '@/db/schemas';

type TransactionProps = {
	mid: number,
	id: number
}

export async function GET(req: Request, props: { params: Promise<TransactionProps> }) {
	const params = await props.params;
	try {
		const transactions = await db.query.transactions.findMany({
			where: (transactions, { eq, and }) => and(eq(transactions.memberId, params.mid), eq(transactions.locationId, params.id)),

		})

		return NextResponse.json(transactions, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 })
	}
}


export async function PUT(req: NextRequest, props: { params: Promise<TransactionProps> }) {
	const params = await props.params;
	const data = await req.json();

	try {

		const transaction = await db.query.transactions.findFirst({
			where: (transactions, { eq }) => eq(transactions.id, data.id),
			with: {
				invoice: {
					with: {
						subscription: true
					}
				}
			}
		})

		/**
		 * Validate transaction for refund processing
		 * 1. Check if transaction exists in the database
		 * 2. Verify it hasn't already been refunded
		 * 3. Ensure it's an eligible transaction type (incoming payment that's completed)
		 */
		if (!transaction) {
			return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
		}

		/**
		 * Prevent duplicate refund attempts
		 * Each transaction can only be refunded once to avoid double refunds
		 */
		if (transaction.refunded) {
			return NextResponse.json({ error: "Transaction already refunded" }, { status: 400 });
		}

		/**
		 * Validate refund eligibility
		 * Only completed incoming payments can be refunded
		 * Outgoing transactions or those with non-completed status (pending, failed) are ineligible
		 */
		if (transaction.transactionType !== "incoming" || transaction.status !== "paid") {
			return NextResponse.json({ error: "Only completed incoming transactions can be refunded" }, { status: 400 });
		}

		if (transaction.paymentType === "card") {
			if (!transaction.invoice || !transaction.invoice.subscription) {
				return NextResponse.json({ error: "Invoice or subscription not found" }, { status: 404 })
			}

			const stripeSubscription = transaction.invoice.subscription.stripeSubscriptionId
			if (!stripeSubscription) {
				return NextResponse.json({ error: "Stripe subscription not found" }, { status: 404 })
			}
			const stripe = await getStripeCustomer({ id: params.id, mid: params.mid })
			const refund = await stripe.refund(data.chargeId);
		}

		await db.update(transactions).set({ refunded: true }).where(eq(transactions.id, data.id))
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err)
		return NextResponse.json({ error: err }, { status: 500 })
	}
}