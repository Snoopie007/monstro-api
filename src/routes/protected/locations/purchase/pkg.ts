import { db } from "@/db/db";
import {
    memberPackages, memberInvoices,
} from "@subtrees/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { z } from "zod";

import {
    calculateThresholdDate,
    calculateChargeDetails,
    triggerPurchase,
    getCurrency,
} from "@/utils";

import Stripe from "stripe";
import { broadcastAchievement } from "@/libs/broadcast/achievements";

const PurchasePkgProps = {
    params: z.object({
        lid: z.string(),
    }),
};



export function purchasePkgRoutes(app: Elysia) {

    app.group('/pkg', (app) => {
        app.post('/', async ({ params, status, body }) => {

            const { lid } = params;
            const { priceId, mid, paymentType } = body;
            try {

                const pricing = await db.query.memberPlanPricing.findFirst({
                    where: (mpp, { eq }) => eq(mpp.id, priceId),
                    with: {
                        plan: true,
                    },
                });

                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }

                const today = new Date();
                let endDate: Date | undefined = undefined;
                if (pricing.expireThreshold && pricing.expireInterval) {
                    endDate = calculateThresholdDate({
                        startDate: today,
                        threshold: pricing.expireThreshold,
                        interval: pricing.expireInterval,
                    });
                }


                const [pkg] = await db.insert(memberPackages).values({
                    locationId: lid,
                    memberId: mid,
                    totalClassLimit: pricing.plan?.totalClassLimit ?? 0,
                    memberPlanPricingId: pricing.id,
                    paymentType: paymentType,
                    startDate: today,
                    expireDate: endDate,
                    status: "incomplete",
                }).returning();

                if (!pkg) {
                    return status(500, { error: "Failed to create package" });
                }
                const { plan, ...rest } = pricing;

                return status(200, {
                    ...pkg,
                    pricing: rest,
                    plan: plan,
                    planId: plan.id,
                });
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to checkout" });
            }
        }, {
            ...PurchasePkgProps,
            body: t.Object({
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
                promoId,
                paymentType
            } = body;

            try {

                const [pricing, ml] = await Promise.all([

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
                                            planId: true,
                                            usagePercent: true,
                                            settings: true,
                                        },
                                    },
                                    integrations: {
                                        where: (integration, { eq }) => eq(integration.service, "stripe"),
                                        columns: {
                                            accountId: true,
                                            accessToken: true,
                                            service: true,
                                        },
                                    },
                                },
                            },
                            member: {
                                columns: {
                                    userId: true,
                                    firstName: true,
                                    lastName: true,
                                    email: true,
                                },
                            },
                        },
                        columns: {
                            stripeCustomerId: true,
                            status: true,
                        },
                    })
                ]);



                if (!ml || !ml.member || !ml.stripeCustomerId) {
                    return status(404, { error: "Member or Stripe customer not found" });
                }


                if (!ml || !ml.location) {
                    return status(404, { error: "Location not found" });
                }


                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }

                const { taxRates, locationState, integrations } = ml.location;

                const integration = integrations[0];
                if (!integration || !integration.accountId || !integration.accessToken) {
                    throw new Error("Stripe integration not found");
                }

                const stripe = new MemberStripePayments(integration.accountId, integration.accessToken);


                stripe.setCustomer(ml.stripeCustomerId);

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
                            type: true,
                            value: true,
                            redemptionCount: true,
                            maxRedemptions: true,
                            allowedPlans: true,
                        },
                    });

                    if (promo) {
                        const { value, redemptionCount, maxRedemptions, type, allowedPlans } = promo;
                        const isWithinRedemption = !maxRedemptions || redemptionCount < maxRedemptions;
                        const isAllowedPlan = allowedPlans ? allowedPlans.includes(pricing.id) : true;

                        if (isWithinRedemption && isAllowedPlan) {

                            if (type === "fixed_amount") {
                                discount = Math.round(value);
                            } else {
                                discount = Math.round(pricing.price * (value / 100));
                            }
                        }
                    }
                }

                const taxRate = taxRates.find((taxRate) => taxRate.isDefault) || taxRates[0];

                const { settings, usagePercent } = locationState;

                const productName = `${pricing.plan.name}/${pricing.name}`;
                const description = `Payment for ${productName}`;
                const chargeDetails = calculateChargeDetails({
                    amount: pricing.price,
                    discount,
                    taxRate: taxRate?.percentage ?? 0,
                    usagePercent: usagePercent || 0,
                    paymentType: paymentType,
                    isRecurring: false,
                    passOnFees: settings?.passOnFees || false,
                });

                const now = new Date();
                const currency = getCurrency(ml.location.country);
                const [invoice] = await db.insert(memberInvoices).values({
                    ...chargeDetails,
                    description,
                    items: [{ name: productName, quantity: 1, price: chargeDetails.unitCost, discount }],
                    memberId: mid,
                    locationId: lid,
                    memberPlanId,
                    paymentType: paymentType,
                    currency,
                    dueDate: now,
                }).returning({ id: memberInvoices.id });


                if (!invoice) {
                    return status(500, { error: "Failed to create invoice" });
                }

                await stripe.processPayment({
                    ...chargeDetails,
                    paymentMethodId: paymentMethodId,
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

                triggerPurchase({ mid, lid, pid: pricing.plan.id }).then((a) => {
                    if (a) {
                        broadcastAchievement(ml.member.userId, a)
                    }
                }).catch((error) => {
                    console.error("Error triggering purchase:", error);
                });
                return status(200, { status: "active" });
            } catch (error) {
                console.log(error);
                if (error instanceof Stripe.errors.StripeError) {
                    const lastError = error.payment_intent?.last_payment_error;
                    const declineCode = lastError?.decline_code;
                    if (declineCode) {
                        return status(400, { error: error.message });
                    }
                    return status(500, { error: error.message });
                }
                return status(500, { error: "Failed to checkout" });
            }
        }, {
            ...PurchasePkgProps,
            body: t.Object({
                paymentMethodId: t.String(),
                priceId: t.String(),
                memberPlanId: t.String(),
                mid: t.String(),
                paymentType: t.Enum(t.Literal('card'), t.Literal('us_bank_account')),
                promoId: t.Optional(t.String()),
            }),
        });

        return app;
    });

    return app

}
