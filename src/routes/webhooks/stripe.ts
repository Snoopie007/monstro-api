import { Elysia, t } from "elysia";
import Stripe from "stripe";
import { MemberStripePayments } from "@/libs/stripe";
import { triggerSignUp } from "@/libs/triggers";

import { memberLocations, memberSubscriptions, memberInvoices, transactions } from "subtrees/schemas";
import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db/db";
import type { ExtractTablesWithRelations } from "drizzle-orm";
import type { PgTransaction } from "drizzle-orm/pg-core";
import type { PostgresJsQueryResultHKT } from "drizzle-orm/postgres-js";;
import { serverConfig } from "@/config";
/**
 * Stripe Webhook Handler for Member Billing Events
 *
 * This webhook handles various Stripe events related to member billing:
 *
 * 1. Traditional Subscription Events:
 *    - invoice.payment_succeeded: For subscription-based recurring billing
 *    - invoice.payment_failed: When subscription payments fail
 *    - customer.subscription.* events: For subscription lifecycle management
 *
 * 2. Recurring Invoice Events (via Subscription Schedules):
 *    - invoice.payment_succeeded: For schedule-based recurring invoices
 *    - invoice.payment_failed: When scheduled invoice payments fail
 *    - invoice.finalized: When invoices are ready for payment
 *    - invoice.updated: For status changes and updates
 *
 * Key Differences:
 * - Subscription invoices: Have invoice.subscription field and create new local invoices
 * - Recurring invoices: Use subscription schedules and update existing local invoices
 * - Recurring invoices are identified by stripeScheduleId in metadata
 */


const allowedEvents: Stripe.Event.Type[] = [
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "customer.subscription.paused",
    "customer.subscription.resumed",
    "invoice.payment_failed",
    "invoice.payment_action_required",
    "invoice.payment_succeeded",
    "invoice.finalized",
    "invoice.updated",
    "payment_intent.canceled",
    "payment_intent.succeeded",
    "coupon.created",
    "coupon.updated",
    "coupon.deleted",
    "promotion_code.created",
    "promotion_code.updated",
    "customer.discount.created",
    "customer.discount.updated",
    "customer.discount.deleted",
];


const stripe = new MemberStripePayments();
// Type extension for Stripe Invoice to include runtime properties
type ExtendedStripeInvoice = Stripe.Invoice & {
    subscription?: string | Stripe.Subscription;
    subscription_details?: {
        metadata?: Record<string, string>;
    };
    total_tax_amounts?: Array<{ amount: number }>;
    charge?: string;
};

export function stripeWebhookRoutes(app: Elysia) {
    app.post('/member/stripe', async ({ body, headers, request, status }) => {

        const signature = headers["stripe-signature"];
        if (typeof signature !== "string") {
            throw new Error("Stripe Hook Signature is not a string");
        }
        if (!process.env.STRIPE_WEBHOOK_SECRET) {
            throw new Error("Stripe Member webhook secret not found");
        }

        let event: Stripe.Event;
        try {
            if (serverConfig.isProduction) {
                const rawText = await request.text();
                event = await stripe.constructEventAsync(
                    Buffer.from(rawText),
                    signature,
                    process.env.STRIPE_WEBHOOK_SECRET
                );
            } else {
                event = body as unknown as Stripe.Event;
            }
        } catch (err) {
            console.error("[STRIPE WEBHOOK] Failed to construct event:", err);
            return status(500, { error: "[STRIPE WEBHOOK] Failed to construct event" });
        }
        // Non-blocking: process in background; do not rethrow
        processEvent(event).catch(err => {
            console.error("[STRIPE WEBHOOK] Failed to process event:", err);
        });
        return status(200, { message: "[STRIPE WEBHOOK] Event processed successfully" });
    }, {
        headers: t.Object({
            "stripe-signature": t.String(),
        }),
        parse: 'none'
    });
    return app;
}

async function processEvent(event: Stripe.Event) {
    if (!allowedEvents.includes(event.type)) {
        return;
    }

    console.log('[STRIPE WEBHOOK] Processing event:', event.type);

    try {
        switch (event.type) {
            case "customer.subscription.deleted":
            case "customer.subscription.paused":
            case "customer.subscription.resumed":
            case "customer.subscription.updated":
                // await updateSubscriptionStatus(event);
                break;
            case "invoice.payment_failed":
                // await handleInvoicePaymentFailed(event);    
                break;
            case "invoice.payment_succeeded":
                // await handleInvoicePaymentSucceeded(event);
                break;
            case "invoice.finalized":
                // await handleInvoiceFinalized(event);
                break;
            case "invoice.updated":
                // await handleInvoiceUpdated(event);
                break;
            case "coupon.created":
            case "coupon.updated":
            case "coupon.deleted":
                // await handleCouponEvent(event);
                break;
            case "promotion_code.created":
            case "promotion_code.updated":
                // await handlePromotionCodeEvent(event);
                break;
            case "customer.discount.created":
            case "customer.discount.updated":
            case "customer.discount.deleted":
                // await handleDiscountEvent(event);
                break;
            default:
                console.warn(`[STRIPE WEBHOOK] Unhandled event type: ${event.type}`);
        }
    } catch (error) {
        console.error(
            `[STRIPE WEBHOOK] Error processing event ${event.type} (${event.id}):`,
            error
        );
        throw error;
    }
}

// async function handleInvoicePaymentSucceeded(event: Stripe.Event) {
//     const invoice = event.data.object as ExtendedStripeInvoice;

//     // Determine if this is a subscription invoice or a recurring schedule invoice
//     if (invoice.subscription) {
//         // Handle traditional subscription invoices
//         await handleSubscriptionInvoicePayment(invoice);
//     } else if (
//         invoice.subscription_details?.metadata?.schedule ||
//         invoice.lines?.data?.[0]?.subscription
//     ) {
//         // Handle recurring schedule invoices (created via subscription schedules)
//         await handleRecurringInvoicePayment(invoice);
//     } else if (invoice.metadata?.type === "one-off-admin-created") {
//         // Handle one-off admin-created invoices
//         await handleOneOffInvoicePayment(invoice);
//     } else {
//         console.warn(
//             `[STRIPE WEBHOOK] Invoice payment succeeded but could not determine type: ${invoice.id}`
//         );
//         console.warn(
//             `[STRIPE WEBHOOK] Invoice details - subscription: ${invoice.subscription
//             }, subscription_details: ${JSON.stringify(
//                 invoice.subscription_details
//             )}, metadata: ${JSON.stringify(invoice.metadata)}`
//         );
//     }
// }

// async function handleSubscriptionInvoicePayment(
//     invoice: ExtendedStripeInvoice
// ) {
//     const subscriptionId = invoice.subscription as string;

//     try {
//         const subscription = await db.query.memberSubscriptions.findFirst({
//             where: eq(memberSubscriptions.id, subscriptionId),
//             with: {
//                 pricing: {
//                     with: {
//                         plan: true,
//                     }
//                 },
//                 member: true,
//             },
//         });

//         if (!subscription) {
//             console.warn(
//                 `No local subscription found for Stripe subscription: ${subscriptionId}`
//             );
//             return;
//         }

//         const tax = calculateTaxFromInvoice(invoice);

//         const pricingName = subscription.pricing?.name ? ` - ${subscription.pricing.name}` : "";
//         const itemName = (subscription.pricing?.plan?.name ?? 'Unknown Plan') + pricingName;

//         await db.transaction(async (tx) => {
//             const CommonFields = {
//                 memberId: subscription.memberId,
//                 locationId: subscription.locationId,
//                 description: invoice.description,
//                 currency: invoice.currency,
//                 tax,
//             };

//             const [result] = await tx.insert(memberInvoices)
//                 .values({
//                     ...CommonFields,
//                     memberSubscriptionId: subscription.id,
//                     status: "paid",
//                     paid: true,
//                     total: invoice.amount_paid,
//                     subtotal: invoice.amount_paid,
//                     discount: 0,
//                     items: [
//                         {
//                             name: itemName,
//                             quantity: 1,
//                             price: invoice.amount_paid,
//                         },
//                     ],
//                     forPeriodStart: new Date(invoice.period_start! * 1000),
//                     forPeriodEnd: new Date(invoice.period_end! * 1000),
//                     dueDate: new Date(invoice.created * 1000),
//                     invoicePdf: invoice.invoice_pdf,
//                     metadata: {
//                         stripeInvoiceId: invoice.id,
//                         invoiceUrl: invoice.hosted_invoice_url,
//                         issuer: (invoice as any).issuer,
//                         type: "subscription",
//                         pricingId: subscription.pricing?.id,
//                     },
//                 }).returning({ invoiceId: memberInvoices.id });
//             if (!result) {
//                 tx.rollback();
//                 return
//             }

//             await tx
//                 .update(memberSubscriptions)
//                 .set({
//                     status: "active",
//                     updated: new Date(),
//                 })
//                 .where(eq(memberSubscriptions.id, subscription.id));

//             await tx
//                 .update(memberLocations)
//                 .set({
//                     status: "active",
//                     updated: new Date(),
//                 })
//                 .where(
//                     and(
//                         eq(memberLocations.memberId, subscription.memberId),
//                         eq(memberLocations.locationId, subscription.locationId)
//                     )
//                 );

//             await createInvoiceTransaction(tx, {
//                 ...CommonFields,
//                 subscriptionId: subscription.id,
//                 invoiceId: result.invoiceId,
//                 amount: invoice.amount_paid,
//                 description: itemName,
//             }, invoice);

//             // Handle make-up credits carry-over on billing period renewal
//             // Reset credits if carry-over is not allowed
//             if (!subscription.allowMakeUpCarryOver) {
//                 await tx
//                     .update(memberSubscriptions)
//                     .set({
//                         makeUpCredits: 0,
//                         updated: new Date(),
//                     })
//                     .where(eq(memberSubscriptions.id, subscription.id));
//             }
//         });

//         if (subscription.pricing?.plan?.id) {
//             await triggerSignUp({
//                 mid: subscription.memberId,
//                 lid: subscription.locationId,
//                 pid: subscription.pricing.plan.id,
//             });
//         }


//     } catch (error) {
//         console.error("Error handling subscription invoice payment:", error);
//     }
// }

// async function handleRecurringInvoicePayment(invoice: ExtendedStripeInvoice) {
//     try {
//         // Try to find the schedule ID from different possible locations
//         let scheduleId: string | undefined;

//         // Check subscription_details metadata
//         if (invoice.subscription_details?.metadata?.schedule) {
//             scheduleId = invoice.subscription_details.metadata.schedule;
//         }

//         // Check if there's a subscription item that points to a schedule
//         if (!scheduleId && invoice.lines?.data?.[0]?.subscription) {
//             const subId = invoice.lines.data[0].subscription;
//             // For schedule-generated subscriptions, we'll need to find the original schedule
//             // This is a fallback - ideally the schedule ID should be in metadata
//             console.warn(
//                 `[STRIPE WEBHOOK] Found subscription ${subId} but no schedule ID in metadata for invoice ${invoice.id}`
//             );
//         }

//         if (!scheduleId) {
//             console.error(
//                 `[STRIPE WEBHOOK] No schedule ID found for recurring invoice: ${invoice.id}`
//             );
//             return;
//         }

//         // Find the invoice by stripeScheduleId in metadata
//         const existingInvoice = await db.query.memberInvoices.findFirst({
//             where: sql`metadata->>'stripeScheduleId' = ${scheduleId}`,
//         });

//         if (!existingInvoice) {
//             console.error(
//                 `[STRIPE WEBHOOK] No local invoice found for schedule: ${scheduleId}`
//             );
//             return;
//         }

//         const tax = calculateTaxFromInvoice(invoice);

//         await db.transaction(async (tx) => {
//             // Update existing invoice status
//             await tx.update(memberInvoices)
//                 .set({
//                     status: "paid",
//                     paid: true,
//                     total: invoice.amount_paid,
//                     subTotal: invoice.amount_paid - tax,
//                     tax: tax,
//                     invoicePdf: invoice.invoice_pdf,
//                     updated: new Date(),
//                     metadata: sql`${memberInvoices.metadata} || ${JSON.stringify({
//                         stripeInvoiceId: invoice.id,
//                         invoiceUrl: invoice.hosted_invoice_url,
//                         paidAt: invoice.status_transitions?.paid_at
//                             ? new Date(invoice.status_transitions.paid_at * 1000)
//                             : new Date(),
//                         type: "recurring_schedule",
//                     })}`,
//                 })
//                 .where(eq(memberInvoices.id, existingInvoice.id));

//             // Create transaction record
//             await createInvoiceTransaction(tx, {
//                 memberId: existingInvoice.memberId,
//                 locationId: existingInvoice.locationId,
//                 invoiceId: existingInvoice.id,
//                 amount: invoice.amount_paid,
//                 description: `Payment for ${existingInvoice.description}`,
//                 currency: invoice.currency,
//                 tax: tax,
//             }, invoice);
//         });
//     } catch (error) {
//         console.error(
//             `[STRIPE WEBHOOK] Error handling recurring invoice payment for ${invoice.id}:`,
//             error
//         );
//         throw error;
//     }
// }

// async function handleOneOffInvoicePayment(invoice: ExtendedStripeInvoice) {
//     try {
//         // Find the local invoice record using the Stripe invoice ID
//         const existingInvoice = await db.query.memberInvoices.findFirst({
//             where: sql`metadata->>'stripeInvoiceId' = ${invoice.id}`,
//         });

//         if (!existingInvoice) {
//             console.error(
//                 `[STRIPE WEBHOOK] No local invoice found for Stripe invoice: ${invoice.id}`
//             );
//             return;
//         }

//         const tax = calculateTaxFromInvoice(invoice);

//         await db.transaction(async (tx) => {
//             // Update existing invoice status
//             await tx.update(memberInvoices).set({
//                 status: "paid",
//                 paid: true,
//                 total: invoice.amount_paid,
//                 subTotal: invoice.amount_paid - tax,
//                 tax: tax,
//                 invoicePdf: invoice.invoice_pdf,
//                 updated: new Date(),
//                 metadata: sql`${memberInvoices.metadata} || ${JSON.stringify({
//                     stripeInvoiceId: invoice.id,
//                     invoiceUrl: invoice.hosted_invoice_url,
//                     paidAt: invoice.status_transitions?.paid_at
//                         ? new Date(invoice.status_transitions.paid_at * 1000)
//                         : new Date(),
//                     type: "one-off-admin-created",
//                 })}`,
//             }).where(eq(memberInvoices.id, existingInvoice.id));

//             // Create transaction record
//             await createInvoiceTransaction(
//                 tx,
//                 {
//                     memberId: existingInvoice.memberId,
//                     locationId: existingInvoice.locationId,
//                     invoiceId: existingInvoice.id,
//                     amount: invoice.amount_paid,
//                     description: `Payment for ${existingInvoice.description}`,
//                     currency: invoice.currency,
//                     tax: tax,
//                 },
//                 invoice
//             );
//         });
//     } catch (error) {
//         console.error(
//             `[STRIPE WEBHOOK] Error handling one-off invoice payment for ${invoice.id}:`,
//             error
//         );
//         throw error;
//     }
// }

// Helper function to calculate tax from Stripe invoice
// function calculateTaxFromInvoice(invoice: ExtendedStripeInvoice): number {
//     if (!invoice.total_tax_amounts?.length) return 0;
//     return invoice.total_tax_amounts.reduce(
//         (total, tax) => total + tax.amount,
//         0
//     );
// }

// // Helper function to create transaction record for paid invoice
// async function createInvoiceTransaction(tx: PgTransaction<
//     PostgresJsQueryResultHKT,
//     typeof import("subtrees/schemas"),
//     ExtractTablesWithRelations<typeof import("subtrees/schemas")>
// >,
//     transactionData: {
//         memberId: string;
//         locationId: string;
//         invoiceId: string;
//         amount: number;
//         description: string;
//         currency: string;
//         tax: number;
//         subscriptionId?: string;
//     },
//     stripeInvoice: ExtendedStripeInvoice
// ) {
//     await tx.insert(transactions).values({
//         memberId: transactionData.memberId,
//         locationId: transactionData.locationId,
//         invoiceId: transactionData.invoiceId,
//         description: transactionData.description,
//         type: "inbound",
//         paymentType: "card", // Could be enhanced to detect actual method
//         total: transactionData.amount,
//         status: "paid",
//         chargeDate: stripeInvoice.status_transitions?.paid_at
//             ? new Date(stripeInvoice.status_transitions.paid_at * 1000)
//             : new Date(stripeInvoice.created * 1000),
//         currency: transactionData.currency,
//         totalTax: transactionData.tax,
//         metadata: {
//             stripeInvoiceId: stripeInvoice.id,
//             stripeChargeId: stripeInvoice.charge,
//         },
//     });
// }

// async function updateSubscriptionStatus(event: Stripe.Event) {
//     console.log('[STRIPE WEBHOOK] Updating subscription status:', event.id);
//     const subscription = event.data.object as Stripe.Subscription;

//     await db
//         .update(memberSubscriptions)
//         .set({
//             status: subscription.status,
//             updated: new Date(),
//         })
//         .where(eq(memberSubscriptions.id, subscription.id));
// }

// async function handleInvoicePaymentFailed(event: Stripe.Event) {
//     const invoice = event.data.object as ExtendedStripeInvoice;

//     // Determine if this is a subscription invoice or a recurring schedule invoice
//     if (invoice.subscription) {
//         // Handle traditional subscription invoice failures
//         await handleSubscriptionInvoiceFailure(invoice);
//     } else if (
//         invoice.subscription_details?.metadata?.schedule ||
//         invoice.lines?.data?.[0]?.subscription
//     ) {
//         // Handle recurring schedule invoice failures
//         await handleRecurringInvoiceFailure(invoice);
//     } else {
//         console.warn(
//             `Invoice payment failed but could not determine type: ${invoice.id}`
//         );
//     }
// }

// async function handleSubscriptionInvoiceFailure(
//     invoice: ExtendedStripeInvoice
// ) {
//     const subscriptionId = invoice.subscription as string;

//     try {
//         await db
//             .update(memberSubscriptions)
//             .set({
//                 status: "past_due",
//                 updated: new Date(),
//             })
//             .where(eq(memberSubscriptions.stripeSubscriptionId, subscriptionId));
//     } catch (error) {
//         console.error(
//             "Error updating subscription status after payment failure:",
//             error
//         );
//     }
// }

// async function handleRecurringInvoiceFailure(invoice: ExtendedStripeInvoice) {
//     try {
//         // Try to find the schedule ID from different possible locations
//         let scheduleId: string | undefined;

//         // Check subscription_details metadata
//         if (invoice.subscription_details?.metadata?.schedule) {
//             scheduleId = invoice.subscription_details.metadata.schedule;
//         }

//         // Check if there's a subscription item that points to a schedule
//         if (!scheduleId && invoice.lines?.data?.[0]?.subscription) {
//             const subId = invoice.lines.data[0].subscription;
//             console.warn(
//                 `Found subscription ${subId} but no schedule ID in metadata for failed invoice ${invoice.id}`
//             );
//         }

//         if (!scheduleId) {
//             console.warn(
//                 `No schedule ID found for failed recurring invoice: ${invoice.id}`
//             );
//             return;
//         }

//         // Find and update the invoice by stripeScheduleId in metadata
//         const result = await db
//             .update(memberInvoices)
//             .set({
//                 status: "unpaid",
//                 attemptCount: sql`${memberInvoices.attemptCount} + 1`,
//                 updated: new Date(),
//                 metadata: sql`${memberInvoices.metadata} || ${JSON.stringify({
//                     lastFailedAt: new Date(),
//                     stripeInvoiceId: invoice.id,
//                     failureReason:
//                         (invoice as any).last_finalization_error?.message ||
//                         "Payment failed",
//                     attemptHistory: {
//                         [Date.now()]: {
//                             reason:
//                                 (invoice as any).last_finalization_error?.message ||
//                                 "Payment failed",
//                             amount: invoice.amount_due,
//                         },
//                     },
//                 })}`,
//             })
//             .where(sql`metadata->>'stripeScheduleId' = ${scheduleId}`)
//             .returning({ id: memberInvoices.id });

//         if (result.length > 0) {
//         } else {
//             console.warn(
//                 `No local invoice found for failed recurring invoice schedule: ${scheduleId}`
//             );
//         }
//     } catch (error) {
//         console.error("Error handling recurring invoice payment failure:", error);
//     }
// }

// async function handleInvoiceFinalized(event: Stripe.Event) {
//     const invoice = event.data.object as ExtendedStripeInvoice;

//     // For now, we'll just log this event as finalization doesn't necessarily mean payment

//     // We could potentially update draft invoices to a 'finalized' status here
//     // if we want to track that state separately
// }

// async function handleInvoiceUpdated(event: Stripe.Event) {
//     const invoice = event.data.object as ExtendedStripeInvoice;

//     // Handle invoice status updates that aren't covered by payment events

//     // We could update invoice metadata or status based on the invoice state
//     // For example, if an invoice is voided or becomes uncollectible
// }

// // async function handlePaymentIntentSucceeded(event: Stripe.Event) {
// // 	const paymentIntent = event.data.object as Stripe.PaymentIntent;
// // 	const metadata = paymentIntent.metadata;

// // 	try {
// // 		const pkg = await db.query.memberPackages.findFirst({
// // 			where: (memberPackages, { eq }) => eq(memberPackages.stripePaymentId, paymentIntent.id),
// // 			with: {
// // 				member: true,
// // 				plan: true,
// // 			}
// // 		})

// // 		if (!pkg) return;

// // 		await db.transaction(async (tx) => {
// // 			const commonFields = {
// // 				memberId: pkg.memberId,
// // 				locationId: pkg.locationId,
// // 				description: paymentIntent.description,
// // 				currency: paymentIntent.currency,
// // 				tax: 0,
// // 				status: "paid",
// // 			};

// // 			const [{ invoiceId }] = await tx.insert(memberInvoices).values({
// // 				...commonFields,
// // 				memberPackageId: pkg.id,
// // 				status: "paid",
// // 				paid: true,
// // 				total: paymentIntent.amount,
// // 				subtotal: paymentIntent.amount,
// // 				discount: 0,
// // 				items: [{
// // 					name: paymentIntent.description,
// // 					quantity: 1,
// // 					price: paymentIntent.amount,
// // 				}],
// // 				dueDate: new Date(metadata.created),
// // 			}).returning({ invoiceId: memberInvoices.id });

// // 			await tx.insert(transactions).values({
// // 				...commonFields,
// // 				packageId: pkg.id,
// // 				invoiceId,
// // 				chargeDate: new Date(paymentIntent.created),
// // 				status: "paid",
// // 				transactionType: "incoming",
// // 				paymentType: 'one_time',
// // 				paymentMethod: "card",
// // 				amount: paymentIntent.amount,
// // 				item: paymentIntent.description,
// // 				metadata: {}
// // 			});
// // 		});
// //  	} catch (error) {
// // 		console.error("Error updating package", error);
// // 	}
// // }

// async function handleCouponEvent(event: Stripe.Event) {
//     const coupon = event.data.object as Stripe.Coupon;
//     console.log(`[STRIPE WEBHOOK] Coupon ${event.type}: ${coupon.id}`);
// }

// async function handlePromotionCodeEvent(event: Stripe.Event) {
//     const promoCode = event.data.object as Stripe.PromotionCode;
//     console.log(`[STRIPE WEBHOOK] Promotion code ${event.type}: ${promoCode.id}`);
// }

// async function handleDiscountEvent(event: Stripe.Event) {
//     const discount = event.data.object as Stripe.Discount;
//     console.log(`[STRIPE WEBHOOK] Discount ${event.type}: ${discount.id}`);
// }
