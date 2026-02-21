import { db } from "@/db/db";
import {
    memberPackages, memberInvoices,
    memberPaymentMethods
} from "@subtrees/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { z } from "zod";

import {
    calculateThresholdDate,
    calculateChargeDetails,
} from "@/libs/utils";

import Stripe from "stripe";

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
            const { paymentMethodId, mid, priceId, memberPlanId, promoId } = body;

            try {

                const [member, location, pricing] = await Promise.all([
                    db.query.members.findFirst({
                        where: (member, { eq }) => eq(member.id, mid),
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

                const { taxRates, locationState, integrations } = location;

                const integration = integrations[0];
                if (!integration || !integration.accountId) {
                    throw new Error("Stripe integration not found");
                }

                const stripe = new MemberStripePayments(integration.accountId);

                const paymentMethod = await db.query.paymentMethods.findFirst({
                    where: (paymentMethod, { eq }) => eq(paymentMethod.id, paymentMethodId),
                });

                if (!paymentMethod) {
                    return status(404, { error: "Payment method not found" });
                }

                await db.insert(memberPaymentMethods).values({
                    paymentMethodId: paymentMethodId,
                    memberId: mid,
                    locationId: lid,
                }).onConflictDoNothing({
                    target: [
                        memberPaymentMethods.paymentMethodId,
                        memberPaymentMethods.memberId,
                        memberPaymentMethods.locationId
                    ],
                });



                stripe.setCustomer(member.stripeCustomerId);

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
                    paymentType: paymentMethod.type,
                    isRecurring: false,
                    passOnFees: settings?.passOnFees || false,
                });



                const now = new Date();

                const [invoice] = await db.insert(memberInvoices).values({
                    ...chargeDetails,
                    description,
                    items: [{ name: productName, quantity: 1, price: chargeDetails.unitCost, discount }],
                    memberId: mid,
                    locationId: lid,
                    memberPlanId,
                    paymentType: paymentMethod.type,
                    currency: pricing.currency,
                    dueDate: now,
                }).returning({ id: memberInvoices.id });


                if (!invoice) {
                    return status(500, { error: "Failed to create invoice" });
                }

                await stripe.processPayment({
                    ...chargeDetails,
                    paymentMethodId: paymentMethod.stripeId,
                    currency: pricing.currency,
                    description,
                    productName,
                    metadata: {
                        memberPlanId,
                        invoiceId: invoice.id,
                        locationId: lid,
                        memberId: mid,
                    },
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
                promoId: t.Optional(t.String()),
            }),
        });

        return app;
    });

    return app

}
