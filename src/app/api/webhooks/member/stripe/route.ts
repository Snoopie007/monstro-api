import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
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
	"payment_intent.canceled",
];

export async function POST(req: NextRequest) {
	const signature = (await headers()).get("Stripe-Signature");

	if (!signature) {
		return NextResponse.json({ message: "Invalid signature", status: 400 })
	};


	const stripe = new MemberStripePayments();
	async function doEventProcessing(): Promise<void> {
		if (typeof signature !== "string") {
			throw new Error("Stripe Hook Signature is not a string");
		}
		if (!process.env.STRIPE_MEMBER_WEBHOOK_SECRET) {
			throw new Error("Stripe Member webhook secret not found");
		}

		const rawText = await req.text();
		const event = await stripe.constructEvent(
			Buffer.from(rawText),
			signature,
			process.env.STRIPE_MEMBER_WEBHOOK_SECRET
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
		case "customer.subscription.updated":
			await handleSubscriptionUpdated(event);
			break;
		case "customer.subscription.deleted":
			await handleSubscriptionDeleted(event);
			break;
		case "customer.subscription.paused":
			await handleSubscriptionPaused(event);
			break;
		case "customer.subscription.resumed":
			await handleSubscriptionResumed(event);
			break;
		case "invoice.payment_failed":
			await handleInvoicePaymentFailed(event);
			break;
		default:
			console.warn(`Unhandled event type: ${event.type}`);
	}
}

async function handleSubscriptionUpdated(event: Stripe.Event) {
	const subscription = event.data.object as Stripe.Subscription;
	const localSubscription = db.update(memberSubscriptions).set({
		status: subscription.status as "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "unpaid" | undefined
	}).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

	console.log("Subscription updated:", localSubscription);
	// Update subscription details in your database
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
	const subscription = event.data.object as Stripe.Subscription;
	const localSubscription = db.update(memberSubscriptions).set({
		status: subscription.status as "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "unpaid" | undefined
	}).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

	console.log("Subscription updated:", localSubscription);
}

async function handleSubscriptionPaused(event: Stripe.Event) {
	const subscription = event.data.object as Stripe.Subscription;
	const localSubscription = db.update(memberSubscriptions).set({
		status: subscription.status as "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "unpaid" | undefined
	}).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

	console.log("Subscription updated:", localSubscription);
	// Update subscription status to paused in your database
}

async function handleSubscriptionResumed(event: Stripe.Event) {
	const subscription = event.data.object as Stripe.Subscription;
	const localSubscription = db.update(memberSubscriptions).set({
		status: subscription.status as "active" | "canceled" | "past_due" | "incomplete" | "trialing" | "unpaid" | undefined
	}).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

	console.log("Subscription updated:", localSubscription);
	// Update subscription status to active in your database
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
	const invoice = event.data.object as Stripe.Invoice;
	console.log(event)
	if (invoice.subscription) {
		const localSubscription = db.update(memberSubscriptions).set({
			status: 'past_due'
		}).where(eq(memberSubscriptions.stripeSubscriptionId, invoice.subscription as string)).returning();

		console.log("Subscription updated:", localSubscription);
	}
	// Notify the user about payment failure or handle retries
}