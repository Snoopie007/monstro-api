import { db } from "@/db/db";
import {
    migrateMembers, memberLocations, memberPackages,
    memberPaymentMethods, transactions
} from "@/db/schemas";
import { MemberStripePayments } from "@/libs/stripe";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculatePeriodEnd,
    calculateTax,
    calculateStripeFeeAmount
} from "../purchase/utils";

const MigratePkgProps = {
    params: z.object({
        migrateId: z.string(),
        lid: z.string(),
    }),
};



export function migratePkgRoutes(app: Elysia) {
    app.post('/pkg', async ({ params, status, body }) => {

        const { lid, migrateId } = params;
        const { priceId, mid, paymentType, paymentMethodId } = body;
        console.log(body);
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
                where: (mpp, { eq }) => eq(mpp.id, priceId),
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
                paymentMethodId: paymentMethod.id,
                memberId: mid,
                locationId: lid,
            }).onConflictDoNothing({
                target: [
                    memberPaymentMethods.paymentMethodId,
                    memberPaymentMethods.memberId,
                    memberPaymentMethods.locationId
                ],
            });

            const today = new Date();
            const endDate = calculatePeriodEnd(
                today,
                pricing.expireInterval!,
                pricing.expireThreshold!
            );

            const metadata = {
                locationId: lid,
                memberId: mid,
            };

            stripe.setCustomer(member.stripeCustomerId);

            const tax = calculateTax(pricing.price, taxRates);
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


            const description = `Payment for ${pricing.plan.name}/${pricing.name}`;
            await stripe.createPaymentIntent(total, applicationFeeAmount, {
                paymentMethod: paymentMethod.stripeId,
                currency: pricing.plan.currency,
                description: description,
                productName: `${pricing.plan.name}/${pricing.name}`,
                unitCost: subTotal,
                tax: tax,
                metadata: {
                    pricingId: pricing.id,
                    planId: pricing.plan.id,
                    ...metadata,
                },
            });


            const pkg = await db.transaction(async (tx) => {
                const [pkg] = await tx.insert(memberPackages).values({
                    locationId: lid,
                    memberId: mid,
                    memberPlanPricingId: pricing.id,
                    paymentType: paymentType,
                    startDate: today,
                    expireDate: endDate,
                    status: "active",
                    metadata: {
                        paymentMethodId: paymentMethod.stripeId,
                    },
                }).returning();


                await tx.update(memberLocations).set({
                    status: "active",
                }).where(and(eq(memberLocations.memberId, mid), eq(memberLocations.locationId, lid)));

                await tx.update(migrateMembers).set({
                    status: "completed",
                    updated: today,
                }).where(eq(migrateMembers.id, migrateId));
                return pkg;
            });





            await db.insert(transactions).values({
                description: description,
                items: [{ name: pricing.plan.name, quantity: 1, price: pricing.price }],
                type: "inbound",
                total: pricing.price + tax,
                subTotal: pricing.price,
                totalTax: tax,
                status: "paid",
                locationId: lid,
                memberId: mid,
                paymentType: paymentType,
                chargeDate: today,
            });

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
        ...MigratePkgProps,
        body: t.Object({
            priceId: t.String(),
            mid: t.String(),
            paymentMethodId: t.String(),
            paymentType: t.Enum(t.Literal('card'), t.Literal('us_bank_account'))
        }),
    })

    return app;

}