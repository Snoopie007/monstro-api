import { db } from "@/db/db";
import { memberLocations, memberSubscriptions } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia } from "elysia";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import {
    calculatePeriodEnd,
    calculateStripeFeePercentage,
    calculateCancelAt
} from "./utils";



import type { PaymentType } from "@/types/DatabaseEnums";

const CheckoutSubProps = {
    params: z.object({
        lid: z.string(),
    }),
};

export function checkoutSubRoutes(app: Elysia) {

    app.group('/sub', (app) => {
        app.post('/payment', async ({ params, status, body }) => {
            const { lid } = params;
            const { paymentMethodId, pricingId, mid, stripeCustomerId, ...data } = body;
            try {


                const pricing = await db.query.memberPlanPricing.findFirst({
                    where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, pricingId),
                    with: {
                        plan: true,
                    },
                });


                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }
                const location = await db.query.locations.findFirst({
                    where: (location, { eq }) => eq(location.id, lid),
                    with: {
                        taxRates: true,
                        locationState: true,

                    },
                });


                if (!location) {
                    return status(404, { error: "Location not found" });
                }
                const { taxRates, locationState } = location;
                const integrations = await db.query.integrations.findFirst({
                    where: (integration, { eq, and }) =>
                        and(
                            eq(integration.locationId, lid),
                            eq(integration.service, "stripe")
                        ),
                    columns: {
                        accountId: true,
                    },
                });

                if (!integrations?.accountId) {
                    throw new Error("Stripe integration not found");
                }

                const stripe = new MemberStripePayments(integrations.accountId);

                const metadata = {
                    locationId: lid,
                    memberId: mid,
                };

                const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];


                const startDate = new Date();
                const endDate = calculatePeriodEnd(
                    startDate,
                    pricing.interval!,
                    pricing.intervalThreshold!
                );

                stripe.setCustomer(stripeCustomerId as string);

                const stripeFeePercentage = calculateStripeFeePercentage(pricing.price, data.paymentType as PaymentType);
                const feePercent = locationState?.usagePercent + stripeFeePercentage;

                const sub = await stripe.createSubscription(pricing, {
                    startDate,
                    taxRateId: taxRate?.stripeRateId || undefined,
                    cancelAt: calculateCancelAt(startDate, pricing),
                    feePercent,
                    paymentMethod: paymentMethodId || undefined,
                    metadata,
                });

                const [subscription] = await db.insert(memberSubscriptions).values({
                    startDate: startDate,
                    stripeSubscriptionId: sub.id,
                    currentPeriodStart: startDate,
                    currentPeriodEnd: endDate,
                    locationId: lid,
                    memberId: mid,
                    memberPlanId: pricing.memberPlanId,
                    memberPlanPricingId: pricing.id,
                    paymentType: data.paymentType,
                    metadata: {
                        stripePaymentMethodId: paymentMethodId,
                    },
                    status: sub.status,
                    memberContractId: data.memberContractId,
                }).returning({ id: memberSubscriptions.id });


                if (!subscription) {
                    return status(500, { error: "Failed to create subscription" });
                }


                return status(200, { id: subscription.id, status: sub.status });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to checkout" });
            }
        }, {
            ...CheckoutSubProps,
            body: z.object({
                paymentMethodId: z.string(),
                pricingId: z.string(),
                mid: z.string(),
                stripeCustomerId: z.string(),
                memberContractId: z.string(),
                paymentType: z.enum(["cash", "card", "us_bank_account", "paypal", "apple_pay", "google_pay"]),
            }),
        });

        app.post('/new-member', async ({ params, status, body }) => {
            const { lid } = params;
            const { subscriptionStatus, mid } = body;



            try {

            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to create subscription" });
            }
        }, {
            ...CheckoutSubProps,
            body: z.object({
                subscriptionStatus: z.enum(["active", "inactive", "pending", "canceled", "expired"]),
                mid: z.string(),
            }),
        });
        return app;
    });

    return app
    // return app.post('/sub', async ({ params, status, body }) => {
    //     const { lid } = params;
    //     const { paymentMethodId, pricingId, memberContractId, mid, ...data } = body;
    //     try {


    //         const pricing = await db.query.memberPlanPricing.findFirst({
    //             where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, pricingId),
    //             with: {
    //                 plan: true,
    //             },
    //         });


    //         if (!pricing) {
    //             return status(404, { error: "Pricing not found" });
    //         }
    //         const location = await db.query.locations.findFirst({
    //             where: (location, { eq }) => eq(location.id, lid),
    //             with: {
    //                 taxRates: true,
    //                 locationState: true,
    //             },
    //         });


    //         if (!location) {
    //             return status(404, { error: "Location not found" });
    //         }
    //         const { taxRates, locationState } = location;
    //         const integrations = await db.query.integrations.findFirst({
    //             where: (integration, { eq, and }) =>
    //                 and(
    //                     eq(integration.locationId, lid),
    //                     eq(integration.service, "stripe")
    //                 ),
    //             columns: {
    //                 accountId: true,
    //             },
    //         });

    //         if (!integrations?.accountId) {
    //             throw new Error("Stripe integration not found");
    //         }

    //         const stripe = new MemberStripePayments(integrations.accountId);

    //         const metadata = {
    //             locationId: lid,
    //             memberId: mid,
    //         };



    //         const startDate = data.startDate ? new Date(data.startDate) : new Date();
    //         const endDate = calculatePeriodEnd(
    //             startDate,
    //             pricing.interval!,
    //             pricing.intervalThreshold!
    //         );

    //         // let stripeCustomer = null;



    //         // stripe.setCustomer(stripeCustomer?.id as string);

    //         const stripeFeePercentage = calculateStripeFeePercentage(pricing.price, data.paymentType as PaymentType);
    //         const feePercent = locationState?.usagePercent + stripeFeePercentage;

    //         const sub = await stripe.createSubscription(pricing, {
    //             startDate,
    //             // taxRateId,
    //             // cancelAt: data.cancelAt,
    //             // trialEnd: data.trialEnd,
    //             feePercent,
    //             paymentMethod: paymentMethodId || undefined,
    //             metadata,
    //         });

    //         const sid = await db.transaction(async (tx) => {
    //             const [ms] = await tx.insert(memberSubscriptions).values({
    //                 startDate: startDate,
    //                 stripeSubscriptionId: sub.id,
    //                 currentPeriodStart: startDate,
    //                 currentPeriodEnd: endDate,
    //                 locationId: lid,
    //                 memberId: mid,
    //                 memberPlanId: pricing.memberPlanId,
    //                 paymentType: data.paymentType,
    //                 metadata: {
    //                     stripePaymentMethodId: paymentMethodId,
    //                 },
    //                 memberContractId: memberContractId,
    //             }).returning({ id: memberSubscriptions.id });
    //            
    //             await tx.update(memberLocations).set({ status: "active" }).where(
    //                 and(
    //                     eq(memberLocations.memberId, mid),
    //                     eq(memberLocations.locationId, lid)
    //                 )
    //             );
    //             return ms.id;
    //         });

    //         // if (data.importId) {
    //         //     await db.update(importMembers).set({
    //         //         status: "completed",
    //         //     }).where(eq(importMembers.id, data.importId));
    //         // }

    //         return status(200, { message: "Checkout" });
    //     } catch (error) {
    //         console.error(error);
    //         return status(500, { error: "Failed to checkout" });
    //     }
    // }, {
    //     ...CheckoutSubProps,
    //     body: z.object({
    //         paymentMethodId: z.string(),
    //         pricingId: z.string(),
    //         mid: z.string(),
    //         memberContractId: z.string(),
    //         startDate: z.string().optional(),
    //         cancelAt: z.string().optional(),
    //         trialEnd: z.string().optional(),
    //         paymentType: z.enum(["cash", "card", "us_bank_account", "paypal", "apple_pay", "google_pay"]),
    //     }),
    // })
}