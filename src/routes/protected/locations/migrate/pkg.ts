import { db } from "@/db/db";
import {
    migrateMembers, memberLocations, memberPackages,
    memberPaymentMethods
} from "@subtrees/schemas";
import { Elysia, t } from "elysia";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import {
    calculateThresholdDate,
} from "@/libs/utils";

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
            const [migrate, paymentMethod] = await Promise.all([
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
                db.query.paymentMethods.findFirst({
                    where: (paymentMethod, { eq }) => eq(paymentMethod.id, paymentMethodId),
                }),
            ]);

            if (!migrate) {
                return status(404, { error: "Migrate not found" });
            }
            if (!paymentMethod) {
                return status(404, { error: "Payment method not found" });
            }

            const pricing = migrate.pricing;

            if (!pricing) {
                return status(404, { error: "Pricing not found" });
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
            const startDate = migrate.backdateStartDate ? new Date(migrate.backdateStartDate) : today;

            let expireDate = migrate?.endDate ? new Date(migrate?.endDate) : undefined;
            if (!expireDate && pricing.expireThreshold && pricing.expireInterval) {
                expireDate = calculateThresholdDate({
                    startDate,
                    threshold: migrate.paymentTermsLeft || pricing.expireThreshold,
                    interval: pricing.expireInterval,
                });
            }

            const { plan, ...rest } = pricing;

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
                    expireDate,
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