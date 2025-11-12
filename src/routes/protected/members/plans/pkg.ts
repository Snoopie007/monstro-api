import { db } from "@/db/db";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";
import { memberLocations, memberPackages } from "@/db/schemas";
import { and } from "drizzle-orm";
import { Elysia } from "elysia";
import { EmailSender } from "@/libs/email";
import { MonstroData } from "@/libs/data";


const emailSender = new EmailSender();


export function memberPlansPkgRoutes(app: Elysia) {
    return app.post('/pkg', async ({ status, params, body }) => {
        const { pid } = params as { pid: string };
        const { familyMemberId } = body as { familyMemberId: string };
        try {
            const pkg = await db.query.memberPackages.findFirst({
                where: (memberPackages, { eq, and }) =>
                    and(
                        eq(memberPackages.id, pid),
                        eq(memberPackages.status, "active")
                    ),
                with: {
                    plan: true,
                    location: true,
                },
            });
            if (!pkg) {
                return status(404, { error: "Plan not found" });
            }
            if (!pkg.plan.family) {
                return status(400, { error: "This is not a family plan" });

            }

            // Get the location ID from the package instead of parameters
            const locationId = pkg.locationId;
            if (!locationId) {
                return status(400, { error: "Location not found for this package" });
            }

            const [result] = await db
                .select({ count: sql<number>`count(*)` })
                .from(memberPackages)
                .where(and(
                    eq(memberPackages.parentId, pid),
                    eq(memberPackages.status, "active")
                ));

            if (pkg.plan?.familyMemberLimit && result && result.count >= pkg.plan.familyMemberLimit) {
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
                memberPlanId: pkg.memberPlanId,
                locationId: locationId,
                memberId: familyMemberId,
                parentId: pid,
            };

            const [familyPackage] = await db
                .insert(memberPackages)
                .values({
                    ...sharedData,
                    paymentType: pkg.paymentType,
                    startDate: pkg.startDate,
                    status: "active",
                })
                .onConflictDoUpdate({
                    target: [memberPackages.memberId, memberPackages.parentId],
                    set: {
                        status: "active",
                    },
                })
                .returning();


            if (!familyPackage) {
                return status(500, { error: "Failed to create family package" });
            }


            /// Send Email to notify family member and have them download the app
    

            return status(200, {
                ...familyPackage,
                member: memberLocation.member,
            });
        } catch (error) {
            console.error(error);
            return status(500, { error: "An error occurred" });
        }
    }).patch('/pkg', async ({ status, params, body }) => {
        const { pid } = params as { pid: string };
        const data = body as Record<string, any>;

        if (data.status === "active") {
            const pkg = await db.query.memberPackages.findFirst({
                where: (mp, { eq }) => eq(mp.id, pid),
                with: {
                    childs: true,
                    plan: true,
                },
            });

            if (!pkg) {
                return status(404, { error: "Package not found" });
            }

            if (pkg.plan.familyMemberLimit && pkg.childs.length >= pkg.plan.familyMemberLimit) {
                return status(400, { error: "Family member limit reached." });
            }
        }

        try {
            await db.update(memberPackages).set(data).where(eq(memberPackages.id, pid));
            return status(200, { success: true });
        } catch (error) {
            console.error(error);
            return status(500, { error: "An error occurred" });
        }
    })
}


