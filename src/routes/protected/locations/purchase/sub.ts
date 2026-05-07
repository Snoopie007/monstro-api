import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions } from "@subtrees/schemas";

import { Elysia, t } from "elysia";
import { z } from "zod";
import {
    calculateThresholdDate,
    calculateChargeDetails,
    triggerNewMember,
    triggerPurchase,
    getCurrency,
    fetchPromoDiscount,
} from "@/utils";
import {
    scheduleCronBasedRenewal, scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import type { SubscriptionJobData } from "@subtrees/bullmq";
import Stripe from "stripe";
import { broadcastAchievement } from "@/libs/broadcast/achievements";
import type { MemberPlanPricing } from "@subtrees/types";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";



const PurchaseSubProps = {
    params: z.object({
        lid: z.string(),
    }),
};

export function purchaseSubRoutes(app: Elysia) {

    app.group('/sub', (app) => {
        app.post('/', async ({ params, status, body }) => {
            const { lid } = params;
            const { priceId, mid, paymentType } = body;
            try {

                const pricing = await db.query.memberPlanPricing.findFirst({
                    where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, priceId),
                    with: {
                        plan: true,
                    },
                });

                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }

                if (!pricing.interval || !pricing.intervalThreshold) {
                    return status(400, { error: "Invalid pricing for subscription plan." });
                }

                const today = new Date();
                const currentPeriodEnd = calculateThresholdDate({
                    startDate: today,
                    threshold: pricing.intervalThreshold,
                    interval: pricing.interval,
                });


                let cancelAt: Date | undefined = undefined;
                if (pricing.expireThreshold && pricing.expireInterval) {
                    cancelAt = calculateThresholdDate({
                        startDate: today,
                        threshold: pricing.expireThreshold,
                        interval: pricing.expireInterval,
                    });
                }

                const classCredits = pricing.plan.classLimitInterval === 'term' ? pricing.plan.totalClassLimit || 0 : 0;

                const [subscription] = await db.insert(memberSubscriptions).values({
                    startDate: today,
                    currentPeriodStart: today,
                    currentPeriodEnd,
                    locationId: lid,
                    memberId: mid,
                    cancelAt,
                    memberPlanPricingId: pricing.id,
                    paymentType: paymentType,
                    classCredits,
                    status: 'incomplete'
                }).returning();

                if (!subscription) {
                    return status(500, { error: "Failed to create subscription" });
                }

                const { plan, ...rest } = pricing;
                return status(200, {
                    ...subscription,
                    plan: plan,
                    pricing: rest,
                    planId: plan.id,
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to checkout" });
            }
        }, {
            ...PurchaseSubProps,
            body: t.Object({
                startDate: t.Optional(t.String()),
                priceId: t.String(),
                mid: t.String(),
                paymentType: t.Enum(t.Literal('card'), t.Literal('us_bank_account'))
            }),
        })
        app.post('/checkout', async ({ params, status, body }) => {
            const { lid } = params;
            const {
                paymentMethodId,
                mid,
                priceId,
                memberPlanId,
                promoId,
                paymentType
            } = body;

            try {

                const [sub, pricing, ml] = await getData(lid, mid, priceId, memberPlanId);
                if (!sub) {
                    return status(404, { error: "Subscription not found" });
                }
                const { member, currentPeriodEnd, currentPeriodStart } = sub;

                if (!ml) {
                    return status(404, { error: "Member or location not found" });
                }

                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }

                if (!pricing.interval || !pricing.intervalThreshold) {
                    return status(400, { error: "Invalid pricing for subscription plan." });
                }
                const { location, gatewayCustomerId } = ml;

                if (!gatewayCustomerId) {
                    return status(404, { error: "Gateway customer not linked to this location" });
                }

                const { taxRates, locationState } = location;
                const { paymentGatewayId, usagePercent, settings } = locationState;
                /* Find the payment gateway */

                if (!paymentGatewayId) {
                    return status(400, { error: "This location does not have a payment gateway set." });
                }
                const gateway = await db.query.integrations.findFirst({
                    where: (integration, { eq }) => eq(integration.id, paymentGatewayId),
                    columns: { accountId: true, accessToken: true, service: true, metadata: true },
                });
                if (!gateway || !gateway.accountId || !gateway.accessToken) {
                    throw new Error("Integration not found");
                }


                /* Calculate the start date */
                const startDate = new Date(currentPeriodStart);

                /* Find the default tax rate */
                const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];

                /* Fetch promo discount */
                const discount = await fetchPromoDiscount(promoId, pricing);

                /* Check if the plan is a no growth plan */
                const noGrowthPlan = [1, 2].includes(locationState.planId);

                /* Calculate charge details */
                const chargeDetails = calculateChargeDetails({
                    amount: pricing.downpayment || pricing.price,
                    discount,
                    taxRate: taxRate?.percentage ?? 0,
                    usagePercent: usagePercent || 0,
                    paymentType: paymentType,
                    isRecurring: noGrowthPlan,
                    passOnFees: settings?.passOnFees || false,
                });

                const productName = pricing.name;
                const description = `${pricing.downpayment ? "Downpayment" : "Payment"} for ${pricing.name}`;


                const currency = getCurrency(ml.location.country);
                const [invoice] = await db.insert(memberInvoices).values({
                    description,
                    items: [{
                        name: productName,
                        quantity: 1,
                        price: chargeDetails.unitCost,
                        discount,
                    }],
                    status: "draft",
                    memberPlanId,
                    memberId: mid,
                    locationId: lid,
                    ...chargeDetails,
                    forPeriodStart: startDate,
                    forPeriodEnd: currentPeriodEnd,
                    currency,
                    dueDate: startDate,
                }).returning({
                    id: memberInvoices.id
                });

                if (!invoice) {
                    return status(500, { error: "Failed to create invoice" });
                }

                /* Process payment */

                if (gateway.service === "stripe") {
                    const stripe = new StripePaymentGateway(gateway.accessToken);
                    await stripe.createCharge(gatewayCustomerId, paymentMethodId, {
                        ...chargeDetails,
                        currency,
                        description,
                        productName,
                        metadata: {
                            memberPlanId,
                            invoiceId: invoice.id,
                            locationId: lid,
                            memberId: mid,
                        },
                    });
                }

                if (gateway.service === "square") {
                    const square = new SquarePaymentGateway(gateway.accessToken);
                    const squareLocationId = gateway.metadata?.squareLocationId;
                    if (!squareLocationId) {
                        throw new Error("Square location ID not found");
                    }
                    await square.createCharge(gatewayCustomerId, paymentMethodId, {
                        ...chargeDetails,
                        currency,
                        referenceId: `${invoice.id}`,
                        squareLocationId,
                        note: `${description}|mid:${mid}|lid:${lid}|subId:${memberPlanId}|promoId:${promoId}`,
                    });
                }


                // Schedule cron or recursive renewal
                if (pricing.interval && pricing.intervalThreshold) {
                    const nextBillingDate = new Date(currentPeriodEnd);
                    if (["month", "year"].includes(pricing.interval)) {
                        const payload: SubscriptionJobData = {
                            sid: memberPlanId,
                            lid: lid,
                            member: {
                                firstName: member.firstName,
                                lastName: member.lastName,
                                email: member.email,
                            },
                            taxRate: taxRate?.percentage || 0,
                            location: {
                                name: ml.location.name,
                                phone: ml.location.phone,
                                email: ml.location.email,
                            },
                            pricing: {
                                name: pricing.name,
                                price: pricing.price,
                                interval: pricing.interval,
                                intervalThreshold: pricing.intervalThreshold,
                            },
                            discount: discount > 0 ? {
                                amount: discount,
                                duration: pricing.intervalThreshold,
                            } : undefined,
                        };
                        if (pricing.intervalThreshold === 1) {

                            scheduleCronBasedRenewal({
                                startDate: nextBillingDate,
                                interval: pricing.interval,
                                data: payload,
                            }).catch((error) => {
                                console.error("Error scheduling cron renewal:", error);
                            });
                        } else {

                            scheduleRecursiveRenewal({
                                startDate: nextBillingDate,
                                data: {
                                    ...payload,
                                    recurrenceCount: 1,
                                },
                            }).catch((error) => {
                                console.error("Error scheduling recursive renewal:", error);
                            });
                        }
                    }
                }

                triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((a) => {
                    if (a) {
                        broadcastAchievement(member.userId, a)
                    }
                })


                return status(200, { success: true });
            } catch (error) {
                console.log(error);
                if (error instanceof Stripe.errors.StripeError) {
                    switch (error.type) {
                        case "StripeCardError":
                            const paymentIntent = error.payment_intent;
                            return status(400, { error: error.message });
                        default:
                            return status(500, { error: error.message });
                    }
                }
                return status(500, { error: "Failed to checkout" });
            }
        }, {
            ...PurchaseSubProps,
            body: t.Object({
                paymentMethodId: t.String(),
                priceId: t.String(),
                memberPlanId: t.String(),
                mid: t.String(),
                promoId: t.Optional(t.String()),
                paymentType: t.Enum(t.Literal('card'), t.Literal('us_bank_account')),
            }),
        });

        return app;
    });

    return app

}


async function getData(lid: string, mid: string, priceId: string, memberPlanId: string) {
    return Promise.all([
        db.query.memberSubscriptions.findFirst({
            where: (memberSubscription, { eq }) => eq(memberSubscription.id, memberPlanId),
            columns: {
                currentPeriodStart: true,
                currentPeriodEnd: true,
            },
            with: {
                member: {
                    columns: {
                        firstName: true,
                        lastName: true,
                        userId: true,
                        email: true,
                    },
                },
            },
        }),

        db.query.memberPlanPricing.findFirst({
            where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, priceId),
            with: {
                plan: true,
            },
        }),
        db.query.memberLocations.findFirst({
            where: (memberLocation, { and, eq }) => and(
                eq(memberLocation.memberId, mid),
                eq(memberLocation.locationId, lid)
            ),
            with: {
                location: {
                    columns: {
                        name: true,
                        phone: true,
                        email: true,
                        country: true,
                    },
                    with: {
                        taxRates: {
                            columns: {
                                percentage: true,
                                isDefault: true,
                            },
                        },
                        locationState: {
                            columns: {
                                paymentGatewayId: true,
                                planId: true,
                                usagePercent: true,
                                settings: true,
                            },
                        },

                    },
                },
            },
            columns: {
                gatewayCustomerId: true,
                onboarded: true,
            },
        })
    ]);

}



