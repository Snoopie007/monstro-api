import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions, transactions } from "@/db/schemas";
import { eq } from "drizzle-orm";
import { waitUntil } from "@vercel/functions";
import { MemberStripePayments } from "@/libs/server/stripe";
import { tryCatch } from "@/libs/utils";



export const config = {
	api: {
		bodyParser: false, // Required for Stripe webhooks
	},
};

const allowedEvents: Stripe.Event.Type[] = [
	"customer.subscription.updated",
	"customer.subscription.deleted",
	"customer.subscription.paused",
	"customer.subscription.resumed",
	"invoice.payment_failed",
	"invoice.payment_action_required",
	"invoice.payment_failed",
	"invoice.payment_succeeded",
	"payment_intent.canceled",
	"payment_intent.succeeded",
	// 'charge.succeeded'

];

const stripe = new MemberStripePayments();
export async function POST(req: NextRequest) {
	const signature = (await headers()).get("Stripe-Signature");

	if (!signature) {
		return NextResponse.json({ message: "Invalid signature", status: 400 })
	};


	async function doEventProcessing(): Promise<void> {
		if (typeof signature !== "string") {
			throw new Error("Stripe Hook Signature is not a string");
		}
		if (!process.env.STRIPE_WEBHOOK_SECRET) {
			throw new Error("Stripe Member webhook secret not found");
		}

		const rawText = await req.text();
		const event = await stripe.constructEvent(
			Buffer.from(rawText),
			signature,
			process.env.STRIPE_WEBHOOK_SECRET
		);

		waitUntil(processEvent(event));
	}

	const { error } = await tryCatch(doEventProcessing());

	if (error) {
		console.error("[STRIPE HOOK] Error processing event", error);
	}

	return NextResponse.json({ message: "Stripe webhook received", status: 200 });
}

async function processEvent(event: Stripe.Event) {

	if (!allowedEvents.includes(event.type)) return;

	switch (event.type) {

		case "customer.subscription.deleted":
		case "customer.subscription.paused":
		case "customer.subscription.resumed":
			await updateSubscriptionStatus(event);
			break;
		case "invoice.payment_failed":
			await handleInvoicePaymentFailed(event);
			break;
		case "invoice.payment_succeeded":
			await handleSubscriptionPaid(event);
			break;
		default:
			console.warn(`Unhandled event type: ${event.type}`);
	}
}

async function handleSubscriptionPaid(event: Stripe.Event) {
	const invoice = event.data.object as Stripe.Invoice;
	const subscriptionDetails = invoice.parent?.subscription_details;
	let subscriptionId: string | undefined;

	if (typeof subscriptionDetails?.subscription === 'string') {
		subscriptionId = subscriptionDetails.subscription;
	} else {
		subscriptionId = subscriptionDetails?.subscription?.id;
	}

	if (!subscriptionId) return;
	try {

		const subscription = await db.query.memberSubscriptions.findFirst({
			where: eq(memberSubscriptions.stripeSubscriptionId, subscriptionId),
			with: {
				plan: true,
				member: true,
			}
		});

		if (!subscription) return;

		const metadata = subscriptionDetails?.metadata;
		let tax = 0;
		if (invoice.total_taxes && invoice.total_taxes.length > 0) {
			tax = invoice.total_taxes.map((tax) => tax.amount).reduce((acc, curr) => acc + curr, 0);
		}

		db.transaction(async (tx) => {
			const commonFields = {
				memberId: subscription.memberId,
				locationId: subscription.locationId,
				description: invoice.description,
				currency: invoice.currency,
				tax,
			};

			const [{ invoiceId }] = await tx.insert(memberInvoices).values({
				...commonFields,
				memberSubscriptionId: subscription.id,
				status: "paid",
				paid: true,
				total: invoice.amount_paid,
				subtotal: invoice.amount_paid,
				discount: 0,
				items: [{
					name: subscription.plan?.name,
					quantity: 1,
					price: invoice.amount_paid,
				}],
				forPeriodStart: new Date(invoice.period_start),
				forPeriodEnd: new Date(invoice.period_end),
				dueDate: new Date(invoice.created),
				invoicePdf: invoice.invoice_pdf,
				settings: {
					stripeInvoiceId: invoice.id,
					invoiceUrl: invoice.hosted_invoice_url,
					issuer: invoice.issuer
				}
			}).returning({ invoiceId: memberInvoices.id });

			await tx.insert(transactions).values({
				...commonFields,
				subscriptionId: subscription.id,
				invoiceId,
				chargeDate: new Date(invoice.created),
				status: "paid",
				transactionType: "incoming",
				paymentType: 'recurring',
				paymentMethod: "card",
				amount: invoice.amount_paid,
				item: subscription.plan?.name,
			});
		});
	} catch (error) {
		console.error("Error updating subscription", error);
	}
}

async function updateSubscriptionStatus(event: Stripe.Event) {
	const subscription = event.data.object as Stripe.Subscription;
	db.update(memberSubscriptions).set({
		status: subscription.status
	}).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id));

	console.log("Subscription updated");
	// Update subscription status to paused in your database
}


async function handleInvoicePaymentFailed(event: Stripe.Event) {
	const invoice = event.data.object as Stripe.Invoice;

	const subscription = invoice.parent?.subscription_details?.subscription as string;
	if (subscription) {
		try {
			await db.update(memberSubscriptions).set({
				status: 'past_due'
			}).where(eq(memberSubscriptions.stripeSubscriptionId, subscription));
		} catch (error) {
			console.error("Error updating subscription", error);
		}
	}
}

// async function handlePaymentIntentSucceeded(event: Stripe.Event) {
// 	const paymentIntent = event.data.object as Stripe.PaymentIntent;
// 	const metadata = paymentIntent.metadata;

// 	try {
// 		const pkg = await db.query.memberPackages.findFirst({
// 			where: (memberPackages, { eq }) => eq(memberPackages.stripePaymentId, paymentIntent.id),
// 			with: {
// 				member: true,
// 				plan: true,
// 			}
// 		})

// 		if (!pkg) return;

// 		await db.transaction(async (tx) => {
// 			const commonFields = {
// 				memberId: pkg.memberId,
// 				locationId: pkg.locationId,
// 				description: paymentIntent.description,
// 				currency: paymentIntent.currency,
// 				tax: 0,
// 				status: "paid",
// 			};

// 			const [{ invoiceId }] = await tx.insert(memberInvoices).values({
// 				...commonFields,
// 				memberPackageId: pkg.id,
// 				status: "paid",
// 				paid: true,
// 				total: paymentIntent.amount,
// 				subtotal: paymentIntent.amount,
// 				discount: 0,
// 				items: [{
// 					name: paymentIntent.description,
// 					quantity: 1,
// 					price: paymentIntent.amount,
// 				}],
// 				dueDate: new Date(metadata.created),
// 			}).returning({ invoiceId: memberInvoices.id });

// 			await tx.insert(transactions).values({
// 				...commonFields,
// 				packageId: pkg.id,
// 				invoiceId,
// 				chargeDate: new Date(paymentIntent.created),
// 				status: "paid",
// 				transactionType: "incoming",
// 				paymentType: 'one_time',
// 				paymentMethod: "card",
// 				amount: paymentIntent.amount,
// 				item: paymentIntent.description,
// 				metadata: {}
// 			});
// 		});
// 	} catch (error) {
// 		console.error("Error updating package", error);
// 	}
// }
