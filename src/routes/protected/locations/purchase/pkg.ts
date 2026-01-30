import { db } from "@/db/db";
import { memberLocations, memberPackages, memberPaymentMethods, transactions } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculateThresholdDate,
    calculateTax,
    calculateStripeFeeAmount
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
            const {
                paymentMethodId, mid, priceId,
                memberPlanId
            } = body;

            try {

                const member = await db.query.members.findFirst({
                    where: (member, { eq }) => eq(member.id, mid),
                });


                if (!member || !member.stripeCustomerId) {
                    return status(404, { error: "Member or Stripe customer not found" });
                }

                const location = await db.query.locations.findFirst({
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
                });


                if (!location) {
                    return status(404, { error: "Location not found" });
                }

                const pricing = await db.query.memberPlanPricing.findFirst({
                    where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, priceId),
                    with: {
                        plan: true,
                    },
                });


                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }


                const { taxRates, locationState, integrations } = location;

                const integration = integrations?.find((i) => i.service === "stripe");
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

                const metadata = {
                    locationId: lid,
                    memberId: mid,
                };

                stripe.setCustomer(member.stripeCustomerId);

                const today = new Date();
                const taxRate = taxRates.find((taxRate) => taxRate.isDefault) || taxRates[0];
                const tax = calculateTax(pricing.price, taxRate);
                let subTotal = pricing.price;
                let total = subTotal + tax;
                const monstroFee = Math.floor(subTotal * (locationState.usagePercent / 100));
                const stripeFee = calculateStripeFeeAmount((
                    locationState.settings.passOnFees ? total : total + monstroFee
                ), paymentMethod.type);

                const applicationFeeAmount = monstroFee + stripeFee;

                if (locationState.settings.passOnFees) {
                    total += applicationFeeAmount;
                    subTotal += applicationFeeAmount;
                }


                const planName = `${pricing.plan.name}/${pricing.name}`;

                await stripe.createPaymentIntent({
                    amount: total,
                    applicationFeeAmount: applicationFeeAmount,
                    paymentMethodId: paymentMethod.stripeId,
                    currency: pricing.plan.currency,
                    description: `Payment for ${planName}`,
                    productName: planName,
                    unitCost: subTotal,
                    tax: tax,
                    metadata: {
                        pricingId: pricing.id,
                        planId: pricing.plan.id,
                        ...metadata,
                    },
                });

                await db.transaction(async (tx) => {
                    await tx.update(memberPackages).set({
                        status: "active",
                        metadata: {
                            paymentMethodId: paymentMethod.stripeId,
                        },
                    }).where(eq(memberPackages.id, memberPlanId));
                    await tx.insert(transactions).values({
                        description: `Payment for ${planName}`,
                        items: [{ name: planName, quantity: 1, price: pricing.price }],
                        type: "inbound",
                        total: pricing.price + tax,
                        subTotal: pricing.price,
                        totalTax: tax,
                        status: "paid",
                        locationId: lid,
                        memberId: mid,
                        paymentType: paymentMethod.type,
                        chargeDate: today,
                    });
                    await tx.update(memberLocations).set({
                        status: "active",
                    }).where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)));
                });

                return status(200, { status: "active" });
            } catch (error) {

                if (error instanceof Stripe.errors.StripeError) {
                    console.error('Stripe error', error.message);
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
                mid: t.String()
            }),
        });

        return app;
    });

    return app

}