import { db } from "@/db/db";
import { memberLocations, memberSubscriptions, transactions } from "@subtrees/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculateThresholdDate,
    calculateChargeDetails,
} from "@/libs/utils";
import {
    scheduleCronBasedRenewal, scheduleRecursiveRenewal,
} from "@/queues/subscriptions";
import type { SubscriptionJobData } from "@subtrees/bullmq";



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


                const classCredits = pricing.plan.classLimitInterval === 'term' ? pricing.plan.totalClassLimit || 0 : 0;

                const [subscription] = await db.insert(memberSubscriptions).values({
                    startDate: today,
                    currentPeriodStart: today,
                    currentPeriodEnd,
                    locationId: lid,
                    memberId: mid,

                    memberPlanPricingId: pricing.id,
                    paymentType: paymentType,
                    classCredits,
                    status: 'incomplete',
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
        app.post('/stripe', async ({ params, status, body }) => {
            const { lid } = params;
            const {
                paymentMethodId,
                mid,
                priceId,
                memberPlanId,
                promoId
            } = body;

            try {

                const [member, location, pricing] = await Promise.all([
                    db.query.members.findFirst({
                        where: (member, { eq }) => eq(member.id, mid),
                        columns: {
                            firstName: true,
                            lastName: true,
                            email: true,
                            stripeCustomerId: true,
                        },
                    }),
                    db.query.locations.findFirst({
                        where: (location, { eq }) => eq(location.id, lid),
                        with: {
                            taxRates: true,
                            locationState: true,
                            integrations: {
                                where: (integration, { eq }) => eq(integration.service, "stripe"),
                                columns: {
                                    accountId: true,
                                    service: true,
                                },
                            },
                        },
                    }),
                    db.query.memberPlanPricing.findFirst({
                        where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, priceId),
                        with: {
                            plan: true,
                        },
                    })
                ]);


                if (!member || !member.stripeCustomerId) {
                    return status(404, { error: "Member or Stripe customer not found" });
                }

                if (!location) {
                    return status(404, { error: "Location not found" });
                }

                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }

                if (!pricing.interval || !pricing.intervalThreshold || !pricing.stripePriceId) {
                    return status(400, { error: "Invalid pricing for subscription plan." });
                }

                const { taxRates, locationState, integrations } = location;

                const integration = integrations?.find((i) => i.service === "stripe");
                if (!integration) {
                    throw new Error("Stripe integration not found");
                }

                const stripe = new MemberStripePayments(integration.accountId);
                stripe.setCustomer(member.stripeCustomerId);
                const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];


                const paymentMethod = await db.query.paymentMethods.findFirst({
                    where: (paymentMethod, { eq }) => eq(paymentMethod.id, paymentMethodId),
                    columns: {
                        stripeId: true,
                        type: true,
                    },
                });

                if (!paymentMethod) {
                    return status(404, { error: "Payment method not found" });
                }

                const metadata = {
                    locationId: lid,
                    memberId: mid,
                };

                const today = new Date();
                let startDate: Date = today;

                let discount: number = 0;
                if (promoId) {
                    const promo = await db.query.promos.findFirst({
                        where: (promo, { eq, and, gt, isNull, or }) => and(
                            eq(promo.id, promoId),
                            eq(promo.isActive, true),
                            or(
                                isNull(promo.expiresAt),
                                gt(promo.expiresAt, new Date())
                            )
                        ),
                        columns: {
                            redemptionCount: true,
                            maxRedemptions: true,
                            allowedPlans: true,
                            type: true,
                            value: true,
                        },
                    });
                    if (promo) {
                        const { redemptionCount, maxRedemptions, allowedPlans } = promo;
                        const isWithinRedemption = !maxRedemptions || redemptionCount < maxRedemptions;
                        const isAllowedPlan = allowedPlans && allowedPlans.includes(pricing.id);
                        if (isWithinRedemption && isAllowedPlan) {
                            if (promo.type === "fixed_amount") {
                                discount = Math.round(promo.value);
                            } else {
                                discount = Math.round(pricing.price * (promo.value / 100));
                            }
                        }
                    }
                }


                let cancelAt: Date | undefined = undefined;
                if (pricing.expireThreshold && pricing.expireInterval) {
                    cancelAt = calculateThresholdDate({
                        startDate: startDate,
                        threshold: pricing.expireThreshold,
                        interval: pricing.expireInterval,
                    });
                }

                const { usagePercent, settings } = locationState;
                const isGrowthPlan = locationState.planId === 3;
                const chargeDetails = calculateChargeDetails({
                    amount: pricing.price,
                    discount,
                    taxRate: taxRate?.percentage ?? 0,
                    usagePercent: usagePercent || 0,
                    paymentType: paymentMethod.type,
                    isRecurring: !isGrowthPlan,
                    passOnFees: settings?.passOnFees || false,
                });

                const productName = pricing.name;
                const description = `Payment for ${pricing.name}`;
                let paymentIntentId: string | undefined = undefined;
                try {
                    const { id } = await stripe.processPayment({

                        ...chargeDetails,
                        paymentMethodId,
                        currency: pricing.currency,
                        description,
                        productName,
                        metadata: {
                            memberSubscriptionId: memberPlanId,
                            ...metadata,
                        },
                    });
                    paymentIntentId = id;
                } catch (error) {

                }


                await db.transaction(async (tx) => {
                    await tx.update(memberSubscriptions).set({
                        status: 'active',
                        cancelAt,
                        stripePaymentId: paymentMethod.stripeId,
                        metadata: {
                            hasPaidDownpayment: !!pricing.downpayment,
                        },
                    }).where(eq(memberSubscriptions.id, memberPlanId));
                    await tx.insert(transactions).values({
                        description,
                        items: [{ name: productName, quantity: 1, price: pricing.price, discount }],
                        type: "inbound",
                        ...chargeDetails,
                        fees: {
                            stripeFee: chargeDetails.stripeFee,
                            monstroFee: chargeDetails.monstroFee,
                        },
                        status: "paid",
                        locationId: lid,
                        memberId: mid,
                        paymentType: paymentMethod.type,
                        chargeDate: today,
                        currency: pricing.currency,
                        metadata: {
                            memberSubscriptionId: memberPlanId,
                        },
                    });
                    await tx.update(memberLocations).set({
                        status: "active",
                    }).where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)));
                });


                // Schedule renewal

                if (pricing.interval && pricing.intervalThreshold) {
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
                            stripeCustomerId: member.stripeCustomerId,
                            location: {
                                name: location.name,
                                phone: location.phone,
                                email: location.email,
                            },
                            pricing: {
                                name: pricing.name,
                                price: pricing.price,
                                currency: pricing.currency,
                                interval: pricing.interval,
                            },
                            discount: discount > 0 ? {
                                amount: discount,
                                duration: pricing.intervalThreshold,
                            } : undefined,
                        };
                        if (pricing.intervalThreshold === 1) {

                            scheduleCronBasedRenewal({
                                startDate,
                                interval: pricing.interval,
                                data: payload,
                            });
                        } else {
                            scheduleRecursiveRenewal({
                                startDate,
                                data: payload,
                            });
                        }

                    }
                }

                return status(200, { status: 'active' });
            } catch (error) {
                console.error(error);
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
            }),
        });

        return app;
    });

    return app

}
