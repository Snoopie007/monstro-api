import { db } from "@/db/db";
import {
    memberPackages, memberSubscriptions,
    migrateMembers, memberLocations, memberCustomFields,
} from "@subtrees/schemas";
import type { PaymentType } from "@subtrees/types";
import { Elysia, t } from "elysia";
import { eq, sql } from "drizzle-orm";
import { calculateThresholdDate } from "@/utils";
import { createLocationChat, addMembertoGroup } from "@/utils/chatsGroupsUtils";

export function migrateAcceptRoutes(app: Elysia) {
    app.post('/accept', async ({ status, params, body }) => {
        const { migrateId, lid } = params;
        const { mid } = body;
        const today = new Date();

        try {
            // Fetch migrate record to get custom field values
            const [migrate, location] = await Promise.all([
                await db.query.migrateMembers.findFirst({
                    where: (mm, { eq }) => eq(mm.id, migrateId),
                    with: {

                        member: {
                            columns: {
                                userId: true,
                                firstName: true,
                            },
                        },
                        pricing: {
                            columns: {
                                id: true,
                                interval: true,
                                intervalThreshold: true,
                                expireInterval: true,
                                expireThreshold: true,
                            },
                            with: {
                                plan: {
                                    columns: {
                                        totalClassLimit: true,
                                    },
                                },
                            },
                        },
                    },
                }),
                db.query.locations.findFirst({
                    where: (location, { eq }) => eq(location.id, lid),
                    columns: {
                        name: true,
                        welcomeMessage: true,
                    },
                    with: {
                        vendor: {
                            columns: {
                                userId: true,
                                firstName: true,
                            },
                        },
                    },
                }),
            ]);


            if (!location) {
                return status(404, { error: "Location not found" });
            }

            if (!migrate || !migrate?.member) {
                return status(404, { error: "Migrate not found" });
            }

            const { pricing, planType, member } = migrate;

            const hasPlan = pricing && planType;
            const hasPayment = migrate?.payment;
            const state = hasPlan && hasPayment ? "incomplete" : "active";




            const [ml] = await db.insert(memberLocations).values({
                memberId: mid,
                locationId: lid,
                status: state,
            }).onConflictDoUpdate({
                target: [memberLocations.memberId, memberLocations.locationId],
                set: {
                    updated: today,
                    status: state,
                },
            }).returning();



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

                        const cancelAt = migrate?.endDate ? new Date(migrate?.endDate) : undefined;

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
                            cancelAt,
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
                ...(!migrate?.memberId && { memberId: mid }),
                ...(!migrate?.payment && { status: "completed" }),
                acceptedOn: today,
                updated: today,
            }).where(eq(migrateMembers.id, migrateId));


            Promise.all([
                addMembertoGroup(lid, member.userId),
                createLocationChat(lid, member, location),
            ]);

            return status(200, ml);
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
    app.post('/decline', async ({ status, params, body }) => {
        const { migrateId } = params;
        const { mid } = body;
        const today = new Date();
        try {
            await db.update(migrateMembers).set({
                memberId: mid,
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
        body: t.Object({
            mid: t.String(),
        }),
    });
    return app;
}


