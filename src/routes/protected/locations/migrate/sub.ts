import { db } from "@/db/db";
import { memberLocations, memberPaymentMethods, memberSubscriptions, migrateMembers } from "@/db/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculatePeriodEnd,
    calculateStripeFeePercentage,
    calculateCancelAt
} from "../purchase/utils";
import type { PaymentType } from "@/types/DatabaseEnums";
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
        const {
            paymentMethodId, mid, priceId,
            paymentType,
            startDate
        } = body;
        const today = new Date();
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

            const paymentMethod = await db.query.paymentMethods.findFirst({
                where: (paymentMethod, { eq }) => eq(paymentMethod.id, paymentMethodId),
            });

            if (!paymentMethod) {
                return status(404, { error: "Payment method not found" });
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

            const pricing = await db.query.memberPlanPricing.findFirst({
                where: (memberPlanPricing, { eq }) => eq(memberPlanPricing.id, priceId),
                with: {
                    plan: true,
                },
            });

            if (!pricing) {
                return status(404, { error: "Pricing not found" });
            }

            const start = startDate ? new Date(startDate) : new Date();
            const end = calculatePeriodEnd(
                start,
                pricing.interval!,
                pricing.intervalThreshold!
            );
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

            const stripeFeePercentage = calculateStripeFeePercentage(pricing.price, paymentType as PaymentType);
            const feePercent = locationState?.usagePercent + stripeFeePercentage;


            const nextBillingDate = isToday(start) ? start : end;

            const stripeSubscription = await stripe.createSubscription(pricing, {
                startDate: nextBillingDate,
                taxRateId: taxRate?.stripeRateId || undefined,
                cancelAt: calculateCancelAt(start, pricing),
                feePercent,
                paymentMethod: paymentMethod.stripeId,
                metadata,
            });

            const sub = await db.transaction(async (tx) => {
                const [sub] = await tx.insert(memberSubscriptions).values({
                    startDate: start,
                    currentPeriodStart: start,
                    currentPeriodEnd: end,
                    locationId: lid,
                    memberId: mid,
                    memberPlanPricingId: pricing.id,
                    stripeSubscriptionId: stripeSubscription.id,
                    paymentType: paymentType,
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
            priceId: t.String(),
            startDate: t.Optional(t.String()),
            mid: t.String(),
            paymentType: t.Enum(t.Literal('card'), t.Literal('us_bank_account'))
        }),
    })


    return app;
}