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
    calculateThresholdDate,
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
        const { mid, paymentMethodId } = body;

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
                        integrations: true,
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

            const { taxRates, locationState, integrations } = location;

            const integration = integrations?.find((i) => i.service === "stripe");
            if (!integration || !integration.accountId) {
                throw new Error("Stripe integration not found");
            }

            const stripe = new MemberStripePayments(integration.accountId);

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
            const startDate = migrate.backdateStartDate ? new Date(migrate.backdateStartDate) : today;
            const endDate = calculateThresholdDate({
                startDate,
                threshold: pricing.expireThreshold!,
                interval: pricing.expireInterval!,
            });

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


            const { plan, ...rest } = pricing;

            const description = `Payment for ${plan.name}/${rest.name}`;
            await stripe.createPaymentIntent(total, applicationFeeAmount, {
                paymentMethod: paymentMethod.stripeId,
                currency: plan.currency,
                description: description,
                productName: `${plan.name}/${rest.name}`,
                unitCost: subTotal,
                tax: tax,
                metadata: {
                    pricingId: pricing.id,
                    planId: plan.id,
                    ...metadata,
                },
            });



            const totalClassLimit = plan.totalClassLimit || 0;
            const totalClassAttended = Math.max(0, totalClassLimit - (migrate.classCredits || 0));
            const pkg = await db.transaction(async (tx) => {
                const [pkg] = await tx.insert(memberPackages).values({
                    locationId: lid,
                    memberId: mid,
                    memberPlanPricingId: pricing.id,
                    startDate,
                    paymentType: paymentMethod.type,
                    totalClassLimit,
                    totalClassAttended,
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
                items: [{ name: `${plan.name}/${rest.name}`, quantity: 1, price: pricing.price }],
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
            priceId: t.Optional(t.String()),
            mid: t.String(),
            paymentMethodId: t.String(),
            paymentType: t.Optional(t.Enum(t.Literal('card'), t.Literal('us_bank_account')))
        }),
    })

    return app;

}