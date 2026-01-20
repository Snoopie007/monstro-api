import { db } from "@/db/db";
import { memberPackages, memberSubscriptions, importMembers, memberLocations } from "@/db/schemas";
import type { MemberPlanPricing, PaymentType } from "@/types";
import { Elysia, t } from "elysia";
import { eq } from "drizzle-orm";
import { addYears, addMonths } from "date-fns";


export function migrateAcceptRoutes(app: Elysia) {
    app.post('/accept', async ({ status, params }) => {
        const { migrateId, lid } = params;
        const today = new Date();
        try {
            const migrate = await db.query.importMembers.findFirst({
                where: (importMembers, { eq }) => eq(importMembers.id, migrateId),
                with: {
                    pricing: true,
                },
            });

            if (!migrate || !migrate.memberId) {
                return status(404, { error: "Migrate not found" });
            }



            let memberLocation = await db.query.memberLocations.findFirst({
                where: (ml, { eq, and }) => and(eq(ml.memberId, migrate.memberId!), eq(ml.locationId, lid)),
            });

            if (!memberLocation) {
                const [newMemberLocation] = await db.insert(memberLocations).values({
                    memberId: migrate.memberId!,
                    locationId: lid,
                    status: "incomplete",
                }).returning();
                if (!newMemberLocation) {
                    return status(500, { error: "Failed to accept " });
                }
                memberLocation = newMemberLocation;
            }


            if (!migrate.payment) {

                await db.transaction(async (tx) => {
                    const { pricing } = migrate;

                    if (!pricing) return;


                    const commonValues = {
                        memberId: memberLocation.memberId,
                        locationId: lid,
                        memberPlanPricingId: pricing.id,
                        status: "active" as const,
                        paymentType: 'cash' as PaymentType,
                    }

                    if (migrate.planType === "recurring") {

                        const { renewalDate, endDate } = calculateRenewalPeriod(migrate.lastRenewalDay, pricing);
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
                    await tx.update(importMembers).set({
                        memberId: memberLocation.memberId,
                        status: "completed",
                        acceptedAt: today,
                        updated: today,
                    }).where(eq(importMembers.id, migrateId))
                });
            }



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