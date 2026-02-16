import { db } from "@/db/db";
import {
    memberLocations, memberPaymentMethods,
    memberSubscriptions, migrateMembers,
    transactions
} from "@subtrees/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculateThresholdDate,
    calculateChargeDetails,
} from "@/libs/utils";
import { isToday } from "date-fns";
import { scheduleCronBasedRenewal, scheduleRecursiveRenewal } from "@/queues/subscriptions";
import type { SubscriptionJobData } from "@subtrees/bullmq";
import Stripe from "stripe";
const MigrateSubProps = {
    params: z.object({
        lid: z.string(),
        migrateId: z.string(),
    }),
};

export function migrateSubRoutes(app: Elysia) {
    app.post('/sub', async ({ params, status, body }) => {
        const { lid, migrateId } = params;
        const { paymentMethodId, mid } = body;
        const today = new Date();

        try {
            const [migrate, location, paymentMethod] = await Promise.all([
                db.query.migrateMembers.findFirst({
                    where: (migrateMember, { eq }) => eq(migrateMember.id, migrateId),
                    with: {
                        member: {
                            columns: {
                                stripeCustomerId: true,
                                firstName: true,
                                lastName: true,
                                email: true,
                            },
                        },
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
                        integrations: {
                            where: (integration, { eq }) => eq(integration.service, "stripe"),
                            columns: {
                                accountId: true,
                                service: true,
                            },
                        },
                    },
                }),
                db.query.paymentMethods.findFirst({
                    where: (paymentMethod, { eq }) => eq(paymentMethod.id, paymentMethodId),
                }),
            ]);

            if (!migrate) {
                return status(404, { error: "Migrate not found" });
            }

            if (!location) {
                return status(404, { error: "Location not found" });
            }
            if (!paymentMethod) {
                return status(404, { error: "Payment method not found" });
            }

            const { pricing, member } = migrate;
            if (!member || !member.stripeCustomerId) {
                return status(404, { error: "Member not found" });
            }
            if (!pricing) {
                return status(404, { error: "Pricing not found" });
            }

            if (!pricing.stripePriceId || !pricing.interval || !pricing.intervalThreshold) {
                return status(400, { error: "Invalid pricing for subscription plan." });
            }

            await db.insert(memberPaymentMethods).values({
                paymentMethodId: paymentMethod.id,
                memberId: mid,
                locationId: lid,
            }).onConflictDoNothing({
                target: [
                    memberPaymentMethods.paymentMethodId,
                    memberPaymentMethods.memberId,
                    memberPaymentMethods.locationId,
                ],
            });

            const currentPeriodStart = migrate.lastRenewalDay ? new Date(migrate.lastRenewalDay) : new Date();

            const currentPeriodEnd = calculateThresholdDate({
                startDate: currentPeriodStart,
                threshold: pricing.intervalThreshold,
                interval: pricing.interval,
            })

            const { taxRates, locationState, integrations } = location;

            const integration = integrations?.find((i) => i.service === "stripe");
            if (!integration) {
                throw new Error("Stripe integration not found");
            }

            const stripe = new MemberStripePayments(integration.accountId);
            stripe.setCustomer(member.stripeCustomerId);
            const metadata = {
                locationId: lid,
                memberId: mid,
            };

            const planName = `${pricing.plan.name}/${pricing.name}`;

            const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];
            let nextBillingDate: Date = currentPeriodStart;

            let paymentIntentId: string | undefined = undefined;
            if (isToday(currentPeriodStart)) {
                const isGrowthPlan = locationState.planId === 3;
                const chargeDetails = calculateChargeDetails({
                    amount: pricing.price,
                    taxRate: taxRate?.percentage ?? 0,
                    usagePercent: locationState.usagePercent || 0,
                    paymentType: paymentMethod.type,
                    isRecurring: !isGrowthPlan,
                    passOnFees: locationState.settings?.passOnFees || false,
                });

                const productName = pricing.name;
                const description = `Payment for ${pricing.name}`;
                try {
                    const { id } = await stripe.processPayment({

                        ...chargeDetails,
                        paymentMethodId,
                        currency: pricing.currency,
                        description,
                        productName,
                        metadata: metadata,
                    });
                    paymentIntentId = id;
                } catch (error) {

                }
                await db.insert(transactions).values({
                    description,
                    items: [{ name: planName, quantity: 1, price: pricing.price }],
                    type: "inbound",
                    ...chargeDetails,
                    fees: {
                        stripeFee: chargeDetails.stripeFee,
                        monstroFee: chargeDetails.monstroFee,
                    },
                    status: paymentIntentId ? "paid" : "failed",
                    locationId: lid,
                    memberId: mid,
                    paymentType: paymentMethod.type,
                    chargeDate: today,
                    currency: pricing.currency,
                });
            } else {
                nextBillingDate = currentPeriodEnd!;
            }

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
                    classCredits: migrate.classCredits || 0,
                    memberPlanPricingId: pricing.id,
                    paymentType: paymentMethod.type,
                    status: paymentIntentId ? 'active' : 'past_due',
                    stripePaymentId: paymentMethod.stripeId,
                }).returning();
                // Insert transaction

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
            if (["month", "year"].includes(pricing.interval)) {
                const payload: SubscriptionJobData = {
                    sid: sub.id,
                    lid: lid,
                    taxRate: taxRate?.percentage || 0,
                    member: {
                        firstName: member.firstName,
                        lastName: member.lastName,
                        email: member.email,
                    },
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
                    }
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