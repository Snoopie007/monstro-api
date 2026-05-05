import { db } from "@/db/db";
import {
    memberInvoices,
    memberLocations,
    memberSubscriptions, migrateMembers,
} from "@subtrees/schemas";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculateThresholdDate,
    calculateChargeDetails,
    getCurrency,
} from "@/utils";
import { isToday } from "date-fns";
import { scheduleCronBasedRenewal, scheduleRecursiveRenewal } from "@/queues/subscriptions";
import type { SubscriptionJobData } from "@subtrees/bullmq";
import Stripe from "stripe";
import { SquarePaymentGateway, StripePaymentGateway } from "@/libs/PaymentGateway";
const MigrateSubProps = {
    params: z.object({
        lid: z.string(),
        migrateId: z.string(),
    }),
};

export function migrateSubRoutes(app: Elysia) {
    app.post('/sub', async ({ params, status, body }) => {
        const { lid, migrateId } = params;
        const { paymentMethodId, mid, paymentType } = body;
        const today = new Date();

        try {
            const [migrate, location] = await Promise.all([
                db.query.migrateMembers.findFirst({
                    where: (migrateMember, { eq }) => eq(migrateMember.id, migrateId),
                    with: {
                        pricing: {
                            with: {
                                plan: true
                            },
                        },
                    },
                }),
                db.query.locations.findFirst({
                    where: (location, { eq }) => eq(location.id, lid),
                    with: {
                        taxRates: true,
                        locationState: true,
                    },
                    columns: {
                        name: true,
                        phone: true,
                        email: true,
                        country: true,
                    },
                }),
            ]);

            if (!migrate) {
                return status(404, { error: "Migrate not found" });
            }

            if (!location) {
                return status(404, { error: "Location not found" });
            }

            const { pricing } = migrate;

            if (!pricing) {
                return status(404, { error: "Pricing not found" });
            }
            if (!pricing.interval || !pricing.intervalThreshold) {
                return status(400, { error: "Invalid pricing for subscription plan." });
            }

            const { taxRates, locationState } = location;
            const { paymentGatewayId } = locationState;
            if (!paymentGatewayId) {
                return status(400, { error: "This location does not have a payment gateway set." });
            }



            const ml = await db.query.memberLocations.findFirst({
                where: (memberLocation, { eq, and }) => and(
                    eq(memberLocation.memberId, mid),
                    eq(memberLocation.locationId, lid)
                ),
                with: {
                    member: {
                        columns: {
                            firstName: true,
                            lastName: true,
                            email: true,
                        },
                    },
                },
                columns: {
                    gatewayCustomerId: true,
                },
            });



            if (!ml || !ml.gatewayCustomerId) {
                return status(404, { error: "Member location or Stripe customer not found" });
            }


            const gateway = await db.query.integrations.findFirst({
                where: (i, { eq, and }) => and(
                    eq(i.id, paymentGatewayId)
                ),
                columns: {
                    accountId: true,
                    accessToken: true,
                    service: true,
                    metadata: true,
                },
            });

            if (!gateway || !gateway.accountId || !gateway.accessToken) {
                return status(404, { error: "Stripe integration not found" });
            }


            const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];

            const currentPeriodStart = migrate.lastRenewalDay ?
                new Date(migrate.lastRenewalDay) : new Date();

            const currentPeriodEnd = calculateThresholdDate({
                startDate: currentPeriodStart,
                threshold: pricing.intervalThreshold,
                interval: pricing.interval,
            })

            let nextBillingDate: Date = currentPeriodStart;


            let cancelAt: Date | undefined = migrate?.endDate ? new Date(migrate?.endDate) : undefined;
            if (!cancelAt && migrate.paymentTermsLeft && pricing.interval) {
                cancelAt = calculateThresholdDate({
                    startDate: nextBillingDate,
                    threshold: migrate.paymentTermsLeft,
                    interval: pricing.interval
                })
            }

            const backdateStartDate = migrate.backdateStartDate ? new Date(migrate.backdateStartDate) : undefined;


            const sub = await db.transaction(async (tx) => {
                const [sub] = await tx.insert(memberSubscriptions).values({
                    startDate: backdateStartDate || currentPeriodStart,
                    currentPeriodStart,
                    currentPeriodEnd,
                    locationId: lid,
                    memberId: mid,
                    cancelAt,
                    classCredits: migrate.classCredits || 0,
                    memberPlanPricingId: pricing.id,
                    paymentType: paymentType,
                    status: 'incomplete',
                    gatewayPaymentId: paymentMethodId,
                }).returning();

                await tx.update(memberLocations).set({
                    status: "active",
                }).where(and(
                    eq(memberLocations.memberId, mid),
                    eq(memberLocations.locationId, lid)
                ));


                await tx.update(migrateMembers).set({
                    status: "completed",
                    updated: today,
                }).where(eq(migrateMembers.id, migrateId));
                return sub;
            });

            if (!sub) {
                return status(500, { error: "Failed to create subscription" });
            }

            const currency = getCurrency(location.country);
            if (isToday(currentPeriodStart)) {
                const productName = pricing.name;
                const description = `Payment for ${pricing.name}`;

                const noGrowthPlan = [1, 2].includes(locationState.planId);
                const chargeDetails = calculateChargeDetails({
                    amount: pricing.price,
                    taxRate: taxRate?.percentage ?? 0,
                    usagePercent: locationState.usagePercent || 0,
                    paymentType: paymentType,
                    isRecurring: noGrowthPlan,
                    passOnFees: locationState.settings?.passOnFees || false,
                });



                const [invoice] = await db.insert(memberInvoices).values({
                    description,
                    items: [{
                        name: productName,
                        quantity: 1,
                        price: chargeDetails.unitCost
                    }],
                    memberPlanId: sub.id,
                    memberId: mid,
                    locationId: lid,
                    ...chargeDetails,
                    forPeriodStart: currentPeriodStart,
                    forPeriodEnd: currentPeriodEnd,
                    currency,
                    dueDate: new Date(),
                }).returning({
                    id: memberInvoices.id
                });


                if (!invoice) {
                    return status(500, { error: "Failed to create invoice" });
                }

                if (gateway.service === "stripe") {

                    try {
                        const stripe = new StripePaymentGateway(gateway.accessToken);
                        await stripe.createCharge(ml.gatewayCustomerId, paymentMethodId, {
                            ...chargeDetails,
                            currency,
                            description,
                            productName,
                            metadata: {
                                locationId: lid,
                                memberId: mid,
                                memberPlanId: pricing.id,
                                invoiceId: invoice.id,
                            },
                        });
                    } catch (error) {

                        console.error(error);
                    }

                } else if (gateway.service === "square") {
                    try {
                        const square = new SquarePaymentGateway(gateway.accessToken);
                        const squareLocationId = gateway.metadata?.squareLocationId;
                        if (!squareLocationId) {
                            throw new Error("Square location ID not found");
                        }
                        await square.createCharge(ml.gatewayCustomerId, paymentMethodId, {
                            ...chargeDetails,
                            currency,
                            referenceId: invoice.id,
                            squareLocationId: squareLocationId,
                            note: `${description}|mid:${mid}|lid:${lid}|subId:${sub.id}|pmid:${paymentMethodId}`,
                        });
                    } catch (error) {
                        console.error(error);
                    }
                }
            } else {
                nextBillingDate = currentPeriodEnd;
            }


            if (["month", "year"].includes(pricing.interval)) {
                const member = ml.member;
                const payload: SubscriptionJobData = {
                    sid: sub.id,
                    lid: lid,
                    taxRate: taxRate?.percentage || 0,
                    member: {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        email: member.email,
                    },
                    stripeCustomerId: ml.gatewayCustomerId,
                    location: {
                        name: location.name,
                        phone: location.phone,
                        email: location.email,
                    },
                    pricing: {
                        name: pricing.name,
                        price: pricing.price,
                        currency: currency || "usd",
                        interval: pricing.interval,
                        intervalThreshold: pricing.intervalThreshold,
                    }
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
            // send email to member

            const { plan, ...rest } = pricing;
            return status(200, {
                ...sub,
                plan: plan,
                pricing: rest,
                planId: plan.id,
            });
        } catch (error) {
            console.log(error);
            if (error instanceof Stripe.errors.StripeError) {
                switch (error.type) {
                    case "StripeCardError":
                        return status(400, { error: error.message });
                    default:
                        return status(500, { error: error.message });
                }
            }
            return status(500, { error: "Failed to checkout" });
        }
    }, {
        ...MigrateSubProps,
        body: t.Object({
            paymentMethodId: t.String(),
            priceId: t.Optional(t.String()),
            startDate: t.Optional(t.String()),
            mid: t.String(),
            paymentType: t.Optional(t.Enum(t.Literal('card'), t.Literal('us_bank_account')))
        }),
    })


    return app;
}