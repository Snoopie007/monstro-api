import { db } from "@/db/db";
import {
    memberLocations, memberPaymentMethods,
    memberSubscriptions, migrateMembers
} from "@subtrees/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculateThresholdDate,
    calculateStripeFeePercentage,
} from "@/libs/utils";
import { isToday } from "date-fns";

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
            const [migrate, member, location, paymentMethod] = await Promise.all([
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
                db.query.paymentMethods.findFirst({
                    where: (paymentMethod, { eq }) => eq(paymentMethod.id, paymentMethodId),
                }),
            ]);

            if (!migrate) {
                return status(404, { error: "Migrate not found" });
            }
            if (!member || !member.stripeCustomerId) {
                return status(404, { error: "Member or Stripe customer not found" });
            }
            if (!location) {
                return status(404, { error: "Location not found" });
            }
            if (!paymentMethod) {
                return status(404, { error: "Payment method not found" });
            }

            const pricing = migrate.pricing;

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

            const metadata = {
                locationId: lid,
                memberId: mid,
            };

            const taxRate = taxRates?.find((t) => t.isDefault) || taxRates[0];

            stripe.setCustomer(member.stripeCustomerId);

            const stripeFeePercentage = calculateStripeFeePercentage(pricing.price, paymentMethod.type, true);
            const feePercent = locationState?.usagePercent + stripeFeePercentage;


            const nextBillingDate = isToday(currentPeriodStart) ? currentPeriodStart : currentPeriodEnd!;

            let cancelAt: Date | undefined = migrate?.endDate ? new Date(migrate?.endDate) : undefined;
            if (!cancelAt && migrate.paymentTermsLeft && pricing.interval) {
                cancelAt = calculateThresholdDate({
                    startDate: nextBillingDate,
                    threshold: migrate.paymentTermsLeft,
                    interval: pricing.interval
                })
            }

            const backdateStartDate = migrate.backdateStartDate ? new Date(migrate.backdateStartDate) : undefined;
            const stripeSubscription = await stripe.createSubscription({
                stripePriceId: pricing.stripePriceId,
                paymentMethodId: paymentMethod.stripeId,
                feePercent,
                startDate: nextBillingDate,
                description: `Subscription to ${pricing.plan.name}/${pricing.name}`,
                taxRateId: taxRate?.stripeRateId || undefined,
                cancelAt,
                metadata,
                backdateStartDate
            });

            const sub = await db.transaction(async (tx) => {
                const [sub] = await tx.insert(memberSubscriptions).values({
                    startDate: backdateStartDate || currentPeriodStart,
                    currentPeriodStart,
                    currentPeriodEnd,
                    locationId: lid,
                    memberId: mid,
                    classCredits: migrate.classCredits || 0,
                    memberPlanPricingId: pricing.id,
                    stripeSubscriptionId: stripeSubscription.id,
                    paymentType: paymentMethod.type,
                    status: 'incomplete',
                    metadata: {
                        paymentMethodId,
                    },
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


            const { plan, ...rest } = pricing;
            return status(200, {
                ...sub,
                plan: plan,
                pricing: rest,
                planId: plan.id,
            });
        } catch (error) {
            console.error(error);
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