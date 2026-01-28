import { db } from "@/db/db";
import { memberSubscriptions } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculateThresholdDate,
    calculateStripeFeePercentage,
} from "./utils";



import type { PaymentType } from "@/types/DatabaseEnums";

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
                }).returning({ id: memberSubscriptions.id });

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
                paymentMethodId, mid, priceId,
                memberPlanId, paymentType
            } = body;

            try {

                const [member, location, pricing] = await Promise.all([
                    db.query.members.findFirst({
                        where: (member, { eq }) => eq(member.id, mid),
                        columns: {
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
                    }),
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


                const { taxRates, locationState, integrations } = location;

                const integration = integrations?.find((i) => i.service === "stripe");
                if (!integration) {
                    throw new Error("Stripe integration not found");
                }

                const stripe = new MemberStripePayments(integration.accountId);

                const metadata = {
                    locationId: lid,
                    memberId: mid,
                };

                const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];
                const startDate = new Date();
                stripe.setCustomer(member.stripeCustomerId);

                const stripeFeePercentage = calculateStripeFeePercentage(pricing.price, paymentType as PaymentType);
                const feePercent = locationState?.usagePercent + stripeFeePercentage;

                let cancelAt: Date | undefined = undefined;
                if (pricing.expireThreshold && pricing.expireInterval) {
                    cancelAt = calculateThresholdDate({
                        startDate: startDate,
                        threshold: pricing.expireThreshold,
                        interval: pricing.expireInterval,
                    });
                }
                const sub = await stripe.createSubscription(pricing, {
                    startDate,
                    taxRateId: taxRate?.stripeRateId || undefined,
                    cancelAt,
                    feePercent,
                    paymentMethod: paymentMethodId || undefined,
                    metadata,
                });


                await db.transaction(async (tx) => {
                    await tx.update(memberSubscriptions).set({
                        status: sub.status,
                        stripeSubscriptionId: sub.id,
                        metadata: {
                            stripePaymentMethodId: paymentMethodId,
                        },
                    }).where(eq(memberSubscriptions.id, memberPlanId));
                });


                return status(200, { status: sub.status });
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
                paymentType: t.Enum(t.Literal('card'), t.Literal('us_bank_account'))
            }),
        });

        return app;
    });

    return app

}