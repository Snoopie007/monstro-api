import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { memberLocations, memberSubscriptions } from "@/db/schemas";
import { and } from "drizzle-orm";
import { Elysia } from "elysia";
import { z } from "zod";



const MemberPlansSubProps = {
    params: z.object({
        pid: z.string(),
    }),
    body: z.object({
        familyMemberId: z.string(),
    }),
};



export function memberPlansSubRoutes(app: Elysia) {
    return app.post('/sub', async ({ status, params, body }) => {
        const { pid } = params;

        const { familyMemberId } = body as { familyMemberId: string };
        try {
            const sub = await db.query.memberSubscriptions.findFirst({
                where: (memberSubscriptions, { eq, and }) =>
                    and(
                        eq(memberSubscriptions.id, pid),
                        eq(memberSubscriptions.status, "active")
                    ),
                with: {
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                    location: true,
                },
            });

            if (!sub) {
                return status(404, { error: "Plan not found" });
            }

            const { plan } = sub.pricing;
            if (!plan.family) {
                return status(400, { error: "This is not a family plan" });
            }

            const locationId = sub.locationId;
            if (!locationId) {
                return status(400, { error: "Location not found for this subscription" });
            }

            const [result] = await db
                .select({ count: sql<number>`count(*)` })
                .from(memberSubscriptions)
                .where(and(
                    eq(memberSubscriptions.parentId, pid),
                    eq(memberSubscriptions.status, "active")
                ));

            if (
                plan?.familyMemberLimit &&
                result && result.count >= plan.familyMemberLimit
            ) {
                return status(400, { error: "Family member limit reached" });
            }

            let memberLocation = await db.query.memberLocations.findFirst({
                where: (memberLocation, { eq }) =>
                    and(
                        eq(memberLocation.memberId, familyMemberId),
                        eq(memberLocation.locationId, locationId)
                    ),
                with: {
                    member: true,
                },
            });

            if (!memberLocation) {
                const member = await db.query.members.findFirst({
                    where: (members, { eq }) => eq(members.id, familyMemberId),
                });
                if (!member) {
                    return status(404, { error: "Family member not found" });
                }
                const [newMemberLocation] = await db
                    .insert(memberLocations)
                    .values({
                        memberId: member.id,
                        locationId: locationId,
                        status: "active",
                    })
                    .returning();

                if (!newMemberLocation) {
                    return status(500, { error: "Failed to create member location" });
                }

                memberLocation = {
                    ...newMemberLocation,
                    member: member,
                };
            }

            const sharedData = {
                memberPlanPricingId: sub?.pricing.id,
                locationId: locationId,
                memberId: memberLocation.memberId,
                parentId: pid,
            };

            const [familySubscription] = await db
                .insert(memberSubscriptions)
                .values({
                    ...sharedData,
                    paymentType: sub.paymentType,
                    startDate: sub.startDate,
                    status: "active",
                    currentPeriodStart: sub.currentPeriodStart,
                    currentPeriodEnd: sub.currentPeriodEnd,
                })
                .onConflictDoUpdate({
                    target: [memberSubscriptions.memberId, memberSubscriptions.parentId],
                    set: {
                        status: "active",
                    },
                })
                .returning();

            if (!familySubscription) {
                return status(500, { error: "Failed to create family subscription" });
            }

            /// Send Email to notify family member and have them download the app

            /// TODO: Trigger signup 
            /// TODO: Trigger increment payments


            return status(200, {
                ...familySubscription,
                member: memberLocation.member,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: "An error occurred" });
        }
    }, MemberPlansSubProps).patch('/sub', async ({ status, params, body }) => {
        const { pid } = params;
        const data = body as Record<string, any>;

        if (data.status === "active") {
            const sub = await db.query.memberSubscriptions.findFirst({
                where: (ms, { eq }) => eq(ms.id, pid),
                with: {
                    childs: true,
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                },
            });

            if (!sub) {
                return status(404, { error: "Subscription not found" });
            }

            const { plan } = sub.pricing;

            if (plan?.familyMemberLimit && sub.childs.length >= plan.familyMemberLimit) {
                return status(400, { error: "Family member limit reached." });
            }
        }

        try {
            await db.update(memberSubscriptions).set({
                ...data,
            }).where(eq(memberSubscriptions.id, pid));
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "An error occurred" });
        }
    }, MemberPlansSubProps)
}
