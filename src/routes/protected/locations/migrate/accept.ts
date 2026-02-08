import { db } from "@/db/db";
import {
    memberPackages, memberSubscriptions,
    migrateMembers, memberLocations, memberCustomFields
} from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { Elysia, t } from "elysia";
import { eq, sql } from "drizzle-orm";
import { calculateThresholdDate } from "@/libs/utils";


export function migrateAcceptRoutes(app: Elysia) {
    app.post('/accept', async ({ status, params, body }) => {
        const { migrateId, lid } = params;
        const { mid } = body;
        const today = new Date();



        try {
            // Fetch migrate record to get custom field values
            const migrate = await db.query.migrateMembers.findFirst({
                where: (mm, { eq }) => eq(mm.id, migrateId),
                with: {
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                },
            });


            const hasPlan = migrate?.pricing && migrate?.planType;

            const hasPayment = migrate?.payment;
            const state = hasPlan && hasPayment ? "incomplete" : "active";

            await db.insert(memberLocations).values({
                memberId: mid,
                locationId: lid,
                status: state,
            }).onConflictDoUpdate({
                target: [memberLocations.memberId, memberLocations.locationId],
                set: {
                    updated: today,
                    status: state,
                },
            });

            // Transfer custom field values if they exist
            const customFieldValues = migrate?.metadata?.customFieldValues;
            if (customFieldValues?.length) {
                const validValues = customFieldValues
                    .filter(cf => cf.fieldId && cf.value != null && cf.value !== '')
                    .map(cf => ({
                        memberId: mid,
                        customFieldId: cf.fieldId,
                        value: cf.value,
                    }));

                if (validValues.length > 0) {
                    await db.insert(memberCustomFields)
                        .values(validValues)
                        .onConflictDoUpdate({
                            target: [memberCustomFields.memberId, memberCustomFields.customFieldId],
                            set: {
                                value: sql`excluded.value`,
                                updated: today,
                            },
                        });
                }
            }

            if (!hasPayment && migrate?.pricing && migrate?.planType) {

                await db.transaction(async (tx) => {
                    const pricing = migrate?.pricing;

                    if (!pricing) return;

                    const commonValues = {
                        memberId: mid,
                        locationId: lid,
                        memberPlanPricingId: pricing.id,
                        status: "active" as const,
                        paymentType: 'cash' as PaymentType,
                    }
                    const startDate = migrate?.backdateStartDate ? new Date(migrate?.backdateStartDate) : today;
                    if (migrate?.planType === "recurring") {

                        // Should never happen but for type safety.
                        if (!pricing.interval || !pricing.intervalThreshold) {
                            return status(400, { error: "Invalid pricing for subscription plan." });
                        }

                        const expiresAt = migrate?.endDate ? new Date(migrate?.endDate) : undefined;

                        const currentPeriodStart = migrate?.lastRenewalDay ? new Date(migrate?.lastRenewalDay) : today;
                        const currentPeriodEnd = calculateThresholdDate({
                            startDate: currentPeriodStart,
                            threshold: pricing.intervalThreshold,
                            interval: pricing.interval,
                        });
                        await tx.insert(memberSubscriptions).values({
                            ...commonValues,
                            startDate,
                            currentPeriodStart,
                            currentPeriodEnd,
                            expiresAt,
                            classCredits: migrate?.classCredits || 0,
                        });
                    } else {
                        const totalClassLimit = pricing.plan.totalClassLimit || 0;
                        const totalClassAttended = Math.max(0, totalClassLimit - (migrate?.classCredits || 0));
                        let expireDate = migrate?.endDate ? new Date(migrate?.endDate) : undefined;
                        if (!expireDate && pricing.expireThreshold && pricing.expireInterval) {
                            expireDate = calculateThresholdDate({
                                startDate,
                                threshold: migrate.paymentTermsLeft || pricing.expireThreshold,
                                interval: pricing.expireInterval,
                            });
                        }
                        await tx.insert(memberPackages).values({
                            ...commonValues,
                            startDate,
                            expireDate,
                            totalClassLimit,
                            totalClassAttended,
                        });
                    }

                });
            }

            await db.update(migrateMembers).set({
                ...(!migrate?.payment && { status: "completed" }),
                acceptedOn: today,
                updated: today,
            }).where(eq(migrateMembers.id, migrateId));

            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to accept migrate" });
        }
    }, {
        params: t.Object({
            migrateId: t.String(),
            lid: t.String(),

        }),
        body: t.Object({
            mid: t.String(),
            payment: t.Optional(t.Boolean()),
            lastRenewalDay: t.Optional(t.String()),
            pricingId: t.Optional(t.Union([t.String(), t.Null()])),
            planType: t.Optional(t.Union([
                t.Literal('recurring'),
                t.Literal('one-time'),
                t.Null()
            ])),
        }),
    });
    app.post('/decline', async ({ status, params }) => {
        const { migrateId } = params;
        const today = new Date();
        try {
            await db.update(migrateMembers).set({
                status: "completed",
                declinedOn: today,
                updated: today,
            }).where(eq(migrateMembers.id, migrateId));
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to decline migrate" });
        }
    }, {
        params: t.Object({
            lid: t.String(),
            migrateId: t.String(),
        }),
    });
    return app;
}


