import { db } from "@/db/db";
import { memberInvoices, memberLocations, memberSubscriptions, transactions } from "@subtrees/schemas";
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
import Stripe from "stripe";



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

                const [sub, location, pricing] = await Promise.all([
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
                                    email: true,
                                    stripeCustomerId: true,
                                },
                            },
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

                if (!sub) {
                    return status(404, { error: "Subscription not found" });
                }
                const { member, currentPeriodEnd, currentPeriodStart } = sub;

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


                const now = new Date();
                const startDate = new Date(currentPeriodStart);

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


                const { usagePercent, settings } = locationState;
                const isGrowthPlan = locationState.planId === 3;
                const chargeDetails = calculateChargeDetails({
                    amount: pricing.downpayment || pricing.price,
                    discount,
                    taxRate: taxRate?.percentage ?? 0,
                    usagePercent: usagePercent || 0,
                    paymentType: paymentMethod.type,
                    isRecurring: isGrowthPlan ? false : pricing.downpayment ? false : true,
                    passOnFees: settings?.passOnFees || false,
                });

                const productName = pricing.name;
                const description = `${pricing.downpayment ? "Downpayment" : "Payment"} for ${pricing.name}`;

                const invoiceData = {
                    description,
                    items: [{
                        name: productName,
                        quantity: 1,
                        price: chargeDetails.unitCost,
                    }],
                    memberId: mid,
                    locationId: lid,
                    memberSubscriptionId: memberPlanId,
                    ...chargeDetails,
                    forPeriodStart: startDate,
                    forPeriodEnd: currentPeriodEnd,
                    discount,
                    currency: pricing.currency,
                    dueDate: startDate,
                }

                let invoiceId: string | null = null;
                const [invoice] = await db.insert(memberInvoices).values({
                    ...invoiceData,
                    status: 'unpaid',
                }).returning({
                    id: memberInvoices.id
                });
                if (invoice) {
                    invoiceId = invoice.id;
                }

                const { id: paymentIntentId } = await stripe.processPayment({
                    ...chargeDetails,
                    paymentMethodId: paymentMethod.stripeId,
                    currency: pricing.currency,
                    description,
                    productName,
                    metadata: {
                        memberSubscriptionId: memberPlanId,
                        ...metadata,
                    },
                });

                await db.transaction(async (tx) => {

                    await tx.update(memberSubscriptions).set({
                        status: paymentIntentId ? 'active' : 'past_due',
                        stripePaymentId: paymentMethod.stripeId,
                        metadata: {
                            hasPaidDownpayment: pricing.downpayment && paymentIntentId,
                        },
                    }).where(eq(memberSubscriptions.id, memberPlanId));
                    await tx.insert(transactions).values({
                        description,
                        items: [{ name: productName, quantity: 1, price: pricing.price, discount }],
                        type: "inbound",
                        ...chargeDetails,
                        invoiceId,
                        fees: {
                            stripeFee: chargeDetails.stripeFee,
                            monstroFee: chargeDetails.monstroFee,
                        },
                        status: paymentIntentId ? "paid" : "failed",
                        locationId: lid,
                        memberId: mid,
                        paymentMethodId: paymentMethod.stripeId,
                        paymentType: paymentMethod.type,
                        chargeDate: now,
                        currency: pricing.currency,
                        metadata: {
                            memberSubscriptionId: memberPlanId,
                        },
                    });
                    if (paymentIntentId && invoiceId) {
                        await tx.update(memberInvoices).set({
                            status: "paid",
                            paid: true,
                        }).where(eq(memberInvoices.id, invoiceId));
                    }
                    await tx.update(memberLocations).set({
                        status: "active",
                    }).where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)));
                });


                // Schedule renewal
                if (!paymentIntentId) {
                    return status(200, { status: 'past_due' });
                }

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
                            });
                        } else {

                            scheduleRecursiveRenewal({
                                startDate: nextBillingDate,
                                data: {
                                    ...payload,
                                    recurrenceCount: 1,
                                },
                            });
                        }
                    }
                }

                return status(200, { status: 'active' });
            } catch (error) {
                console.log(error);
                if (error instanceof Stripe.errors.StripeError) {
                    switch (error.type) {
                        case "StripeCardError":
                            const paymentIntent = error.payment_intent;
                            console.log(paymentIntent);
                            console.log(error.code);
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
            }),
        });

        return app;
    });

    return app

}
