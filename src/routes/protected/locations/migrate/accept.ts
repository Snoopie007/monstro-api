import { db } from "@/db/db";
import { memberPackages, memberSubscriptions, migrateMembers, memberLocations, memberCustomFields } from "@/db/schemas";
import type { MemberPlanPricing, PaymentType } from "@/types";
import { Elysia, t } from "elysia";
import { eq, sql } from "drizzle-orm";
import { addYears, addMonths } from "date-fns";


export function migrateAcceptRoutes(app: Elysia) {
    app.post('/accept', async ({ status, params, body }) => {
        const { migrateId, lid } = params;
        const { mid, payment, planType, lastRenewalDay, pricingId } = body;
        const today = new Date();

        const hasPlan = pricingId && planType;


        try {

            const state = hasPlan && payment ? "incomplete" : "active";

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

            // Fetch migrate record to get custom field values
            const migrateRecord = await db.query.migrateMembers.findFirst({
                where: (mm, { eq }) => eq(mm.id, migrateId),
            });

            // Transfer custom field values if they exist
            if (migrateRecord?.metadata?.customFieldValues?.length) {
                const validValues = migrateRecord.metadata.customFieldValues
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

            if (!payment && pricingId && planType) {

                await db.transaction(async (tx) => {
                    const pricing = await db.query.memberPlanPricing.findFirst({
                        where: (mpp, { eq }) => eq(mpp.id, pricingId)
                    });

                    if (!pricing) return;


                    const commonValues = {
                        memberId: mid,
                        locationId: lid,
                        memberPlanPricingId: pricing.id,
                        status: "active" as const,
                        paymentType: 'cash' as PaymentType,
                    }

                    if (planType === "recurring") {

                        const { renewalDate, endDate } = calculateRenewalPeriod(new Date(lastRenewalDay), pricing);
                        await tx.insert(memberSubscriptions).values({
                            ...commonValues,
                            startDate: renewalDate,
                            currentPeriodStart: renewalDate,
                            currentPeriodEnd: endDate,
                        });
                    } else {
                        await tx.insert(memberPackages).values({
                            ...commonValues,
                            startDate: today,
                        });
                    }

                });
            }

            await db.update(migrateMembers).set({
                ...(!payment && { status: "completed" }),
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
            payment: t.Boolean(),
            lastRenewalDay: t.String(),
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



function calculateRenewalPeriod(startDate: Date, pricing: MemberPlanPricing): { renewalDate: Date, endDate: Date } {

    let renewalDate = startDate;
    let endDate = startDate;
    if (pricing.interval === "month") {
        renewalDate = addMonths(startDate, pricing.intervalThreshold || 1);
        endDate = addMonths(renewalDate, pricing.intervalThreshold || 1);
    } else if (pricing.interval === "year") {
        renewalDate = addYears(startDate, pricing.intervalThreshold || 1);
        endDate = addYears(renewalDate, pricing.intervalThreshold || 1);
    }

    return {
        renewalDate,
        endDate,
    }
}