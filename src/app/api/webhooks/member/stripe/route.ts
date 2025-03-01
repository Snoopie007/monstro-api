import { NextRequest, NextResponse } from "next/server";
import { headers } from "next/headers";
import Stripe from "stripe";
import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import { eq } from "drizzle-orm";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY ?? '', {
  apiVersion: "2025-01-27.acacia",
});

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
    return NextResponse.json({ message: "No signature" }, { status: 400 });
  }

  const rawBody = await req.text();
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, process.env.STRIPE_WEBHOOK_SECRET ?? '');
  } catch (err) {
    console.error("Webhook signature verification failed.", err);
    return NextResponse.json({ message: "Webhook signature verification failed." }, { status: 400 });
  }

  try {
    await processEvent(event);
    return NextResponse.json({ message: "Event processed successfully." }, { status: 200 });
  } catch (error) {
    console.error("Error processing event:", error);
    return NextResponse.json({ message: "Error processing event." }, { status: 500 });
  }
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
    status: subscription.status
  }).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

  console.log("Subscription updated:", localSubscription);
  // Update subscription details in your database
}

async function handleSubscriptionDeleted(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const localSubscription = db.update(memberSubscriptions).set({
    status: subscription.status
  }).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

  console.log("Subscription updated:", localSubscription);
}

async function handleSubscriptionPaused(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const localSubscription = db.update(memberSubscriptions).set({
    status: subscription.status
  }).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

  console.log("Subscription updated:", localSubscription);
  // Update subscription status to paused in your database
}

async function handleSubscriptionResumed(event: Stripe.Event) {
  const subscription = event.data.object as Stripe.Subscription;
  const localSubscription = db.update(memberSubscriptions).set({
    status: subscription.status
  }).where(eq(memberSubscriptions.stripeSubscriptionId, subscription.id)).returning();

  console.log("Subscription updated:", localSubscription);
  // Update subscription status to active in your database
}

async function handleInvoicePaymentFailed(event: Stripe.Event) {
  const invoice = event.data.object as Stripe.Invoice;
  console.log(event)
  if(invoice.subscription) {
    const localSubscription = db.update(memberSubscriptions).set({
        status: 'past_due'
      }).where(eq(memberSubscriptions.stripeSubscriptionId, invoice.subscription as string)).returning();
    
      console.log("Subscription updated:", localSubscription);
  }
  // Notify the user about payment failure or handle retries
}