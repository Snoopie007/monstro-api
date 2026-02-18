import { NextResponse } from "next/server";
import { db } from "@/db/db";
import { MemberStripePayments, VendorStripePayments } from "@/libs/server/stripe";
import { eq } from "drizzle-orm";
import { transactions } from "@subtrees/schemas";
import Stripe from "stripe";

type TransactionProps = {
	mid: string;
	id: string;
};

export async function GET(
	req: Request,
	props: { params: Promise<TransactionProps> }
) {
	const params = await props.params;
	try {
		const transactions = await db.query.transactions.findMany({
			where: (transactions, { eq, and }) =>
				and(
					eq(transactions.memberId, params.mid),
					eq(transactions.locationId, params.id)
				),
		});

		return NextResponse.json(transactions, { status: 200 });
	} catch (err) {
		return NextResponse.json({ error: err }, { status: 500 });
	}
}

export async function PUT(req: Request, props: { params: Promise<TransactionProps> }) {
	const params = await props.params;
	const { chargeId, subscriptionId, packageId } = await req.json();

	if (!chargeId) {
		throw new Error("Transaction ID is required");
	}

	try {
		const transaction = await db.query.transactions.findFirst({
			where: (transactions, { eq }) =>
				eq(transactions.metadata, { chargeId: chargeId }),
			with: {
				member: true,
			},
		});


		if (!transaction) {
			throw new Error("Transaction not found");
		}
		const { member } = transaction;
		if (!member) {
			throw new Error("Member not found");
		}

		/**
		 * Prevent duplicate refund attempts
		 * Each transaction can only be refunded once to avoid double refunds
		 */
		if (transaction.refunded) {
			throw new Error("Transaction already refunded");
		}


		/**
		 * Validate refund eligibility
		 * Only completed incoming payments can be refunded
		 * Outgoing transactions or those with non-completed status (pending, failed) are ineligible
		 */
		if (transaction.type !== "inbound" || transaction.status !== "paid") {
			throw new Error("Only completed incoming transactions can be refunded");
		}

		let stripeRefunded: Stripe.Response<Stripe.Refund> | null = null;
		if (transaction.paymentType === "card") {

			// Get the actual Stripe charge ID for refund
			let stripeChargeId: string | null = null;

			if (subscriptionId) {
				// For subscription-based transactions, verify Stripe subscription exists
				const sub = await db.query.memberSubscriptions.findFirst({
					where: (memberSubscriptions, { eq }) =>
						eq(memberSubscriptions.id, subscriptionId),
				});
				if (!sub?.stripePaymentId) {
					throw new Error("Stripe subscription not found");
				}

				// For subscriptions, the charge ID might be in transaction metadata
				stripeChargeId = transaction.metadata?.chargeId as string;

				if (!stripeChargeId) {
					throw new Error("Stripe charge ID not found in transaction metadata");
				}

				// Use customer-based Stripe instance for subscriptions

				const integrations = await db.query.integrations.findFirst({
					where: (integrations, { eq, and }) => and(
						eq(integrations.locationId, params.id),
						eq(integrations.service, "stripe")
					),
				});
				if (!integrations || !integrations.accountId) {
					throw new Error("Stripe integration not found");
				}
				if (!member.stripeCustomerId) {
					throw new Error("Stripe customer not found");
				}
				const stripe = new MemberStripePayments(integrations.accountId);
				stripe.setCustomer(member.stripeCustomerId);

				stripeRefunded = await stripe.refund(stripeChargeId);
			} else {
				stripeChargeId = transaction.metadata?.chargeId as string;
				if (!stripeChargeId) {
					throw new Error("Stripe charge ID not found for package transaction");
				}

				// For package-based transactions, refund directly using charge ID
				// without needing a Stripe customer, since packages are one-time payments
				const stripe = new VendorStripePayments();
				stripeRefunded = await stripe.refund(stripeChargeId);
			}
		}
		if (stripeRefunded) {
			await db.update(transactions).set({ refunded: true })
				.where(eq(transactions.metadata, { chargeId: chargeId }));

		}
		return NextResponse.json({ success: true }, { status: 200 });
	} catch (err) {
		console.log(err);
		return NextResponse.json({ error: err }, { status: 500 });
	}
}
