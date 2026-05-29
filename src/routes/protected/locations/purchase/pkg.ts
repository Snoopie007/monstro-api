import { db } from "@/db/db";
import {
    memberPackages, memberInvoices,
} from "@subtrees/schemas";
import { Elysia, t } from "elysia";
import { z } from "zod";

import {
    calculateChargeDetails,
    triggerPurchase,
    getCurrency,
    fetchPromoDiscount,
    calculateThresholdDate,
} from "@/utils";

import Stripe from "stripe";
import { broadcastAchievement } from "@/libs/broadcast/achievements";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
import { SquareError } from "square";
import { handleSquareError, handleStripeError } from "@/utils";




const PurchasePkgProps = {
    params: z.object({
        lid: z.string(),
    }),
    body: t.Object({
        paymentMethodId: t.String(),
        priceId: t.String(),
        memberPlanId: t.String(),
        mid: t.String(),
        paymentType: t.Enum(t.Literal('card'), t.Literal('us_bank_account')),
        promoId: t.Optional(t.String()),
    }),
};

export function purchasePkgRoutes(app: Elysia) {

    app.group('/pkg', (app) => {

        app.post('/', async ({ params, status, body }) => {
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

                const [pricing, ml] = await fetchData(lid, mid, priceId);

                if (!ml) {
                    return status(404, { error: "Member don't belong to this location" });
                }
                if (!pricing) {
                    return status(404, { error: "Pricing not found" });
                }
                const { location, gatewayCustomerId } = ml;

                if (!gatewayCustomerId) {
                    return status(404, { error: "Gateway customer not linked to this location" });
                }


                const { taxRates, locationState } = location;
                const { settings, usagePercent, paymentGatewayId } = locationState;

                if (!paymentGatewayId) {
                    return status(400, { error: "This location does not have a payment gateway set." });
                }
                const gateway = await db.query.integrations.findFirst({
                    where: (integration, { eq }) => eq(integration.id, paymentGatewayId),
                    columns: { accountId: true, accessToken: true, service: true, metadata: true },
                });


                const discount = await fetchPromoDiscount(promoId, pricing);
                const taxRate = taxRates.find((taxRate) => taxRate.isDefault) || taxRates[0];


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

                const today = new Date();
                let endDate: Date | undefined = undefined;
                if (pricing.expireThreshold && pricing.expireInterval) {
                    endDate = calculateThresholdDate({
                        startDate: today,
                        threshold: pricing.expireThreshold,
                        interval: pricing.expireInterval,
                    });
                }
                await db.transaction(async (tx) => {
                    if (!gateway || !gateway.accountId || !gateway.accessToken) {
                        throw new Error("Integration not found");
                    }
                    await tx.insert(memberPackages).values({
                        locationId: lid,
                        memberId: mid,
                        totalClassLimit: pricing.plan?.totalClassLimit ?? 0,
                        memberPlanPricingId: pricing.id,
                        paymentType: paymentType,
                        startDate: today,
                        expireDate: endDate,
                        status: "incomplete",
                    });

                    const [invoice] = await tx.insert(memberInvoices).values({
                        ...chargeDetails,
                        description,
                        items: [{
                            name: productName,
                            quantity: 1,
                            price: chargeDetails.unitCost,
                            discount,
                        }],
                        memberId: mid,
                        locationId: lid,
                        memberPlanId,
                        paymentType,
                        currency,
                        dueDate: now,
                    }).returning({ id: memberInvoices.id });


                    if (!invoice) {
                        tx.rollback();
                        throw new Error("Failed to create invoice");
                    }


                    if (gateway.service === "stripe") {
                        try {

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
                        } catch (error) {
                            console.error(error);
                            throw error;
                        }
                    }

                    if (gateway.service === "square") {
                        try {
                            const square = new SquarePaymentGateway(gateway.accessToken);
                            const squareLocationId = gateway.metadata?.squareLocationId;
                            if (!squareLocationId) {
                                throw new Error("Square location ID not found");
                            }

                            await square.createCharge(gatewayCustomerId, paymentMethodId, {
                                total: chargeDetails.total,
                                feesAmount: chargeDetails.feesAmount,
                                currency,
                                note: `${productName}|${description}|invId:${invoice.id}|mid:${mid}|lid:${lid}|pmid:${paymentMethodId}`,
                                referenceId: `${invoice.id}`,
                                squareLocationId: squareLocationId,
                            });
                        } catch (error) {
                            console.error(error);
                            throw error;
                        }
                    }
                })


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
                if (error instanceof SquareError) {
                    const { code, message } = handleSquareError(error);
                    return status(400, { error: message });
                }
                if (error instanceof Stripe.errors.StripeError) {
                    const { code, message } = handleStripeError({ error });
                    return status(500, { error: error.message });
                }
                return status(500, { error: "Failed to checkout" });
            }
        }, PurchasePkgProps);
        return app;
    });

    return app

}


async function fetchData(lid: string, mid: string, priceId: string) {

    return Promise.all([

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
                                paymentGatewayId: true,
                                settings: true,
                                waiverId: true,
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
                gatewayCustomerId: true,
                status: true,
                signedWaiverId: true,
            },
        })
    ]);
}
