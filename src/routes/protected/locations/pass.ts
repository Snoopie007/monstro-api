import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { memberLocations, memberPackages } from "@subtrees/schemas";
import { calculateThresholdDate } from "@/utils";
import { and, eq, sql } from "drizzle-orm"; // Remove duplicate eq

const LocationPassProps = {
    params: t.Object({
        lid: t.String(),
    }),
    body: t.Object({
        planId: t.String(),
        memberId: t.String(),
    }),
};

export function locationPass(app: Elysia) {
    app.get('/pass/[passId]/count', async ({ params, status }) => {
        const { passId } = params;
        // Fix: Safeguard destructuring and ensure result always exists
        const result = await db
            .select({ count: sql<number>`count(*)` })
            .from(memberPackages)
            .where(and(eq(memberPackages.id, passId)))
            .limit(1);
        const count = result?.[0]?.count ?? 0;
        if (!count) {
            return status(404, { error: 'Pass not found' });
        }
        return status(200, { count });
    }, {
        params: t.Object({
            passId: t.String(),
            lid: t.String(),
        }),
    });

    app.post('/pass', async ({ params, body, status }) => {
        const { lid } = params;
        const { planId, memberId } = body;

        try {
            // Typo fix: reference to memberPlans in query - import if necessary
            const plan = await db.query.memberPlans.findFirst({
                where: (memberPlans, { eq, and }) => and(
                    eq(memberPlans.id, planId),
                    eq(memberPlans.type, "pass"),
                ),
                columns: {
                    id: true,
                    totalClassLimit: true,
                },
                with: {
                    pricings: {
                        columns: {
                            id: true,
                            expireInterval: true,
                            expireThreshold: true,
                        },
                    },
                },
            });
            if (!plan || !plan.pricings || plan.pricings.length === 0) {
                return status(404, { error: 'Plan not found' });
            }

            const pricing = plan.pricings[0];
            if (!pricing) {
                return status(404, { error: 'Pricing not found' });
            }

            const existingPass = await db.query.memberPackages.findFirst({
                where: (memberPackages, { eq, and }) => and(
                    eq(memberPackages.memberId, memberId),
                    eq(memberPackages.memberPlanPricingId, pricing.id),
                ),
            });
            if (existingPass) {
                return status(400, { error: 'Pass has already been claimed' });
            }

            const ml = await db.query.memberLocations.findFirst({
                where: (memberLocations, { eq, and }) => and(
                    eq(memberLocations.memberId, memberId),
                    eq(memberLocations.locationId, lid),
                ),
            });

            // Wrap transaction correctly and use the passed-in connection
            const pkg = await db.transaction(async (tx) => {
                let newMl = ml;
                if (!ml) {
                    const inserted = await tx.insert(memberLocations).values({
                        memberId,
                        locationId: lid,
                        status: 'trialing',
                    }).returning();
                    newMl = inserted?.[0];
                }

                let expireDate: Date | undefined = undefined;
                if (pricing.expireInterval && pricing.expireThreshold) {
                    expireDate = calculateThresholdDate({
                        startDate: new Date(),
                        threshold: pricing.expireThreshold,
                        interval: pricing.expireInterval,
                    });
                }

                const insertedPackages = await tx.insert(memberPackages).values({
                    memberId,
                    memberPlanPricingId: pricing.id,
                    locationId: lid,
                    startDate: new Date(),
                    status: 'active',
                    paymentType: 'cash',
                    totalClassLimit: plan.totalClassLimit || 0,
                    expireDate,
                }).returning();
                return insertedPackages?.[0];
            });

            if (!pkg) {
                return status(500, { error: 'Failed to create package' });
            }

            return status(200, pkg);
        } catch (error) {
            console.error(error);
            return status(500, { error: 'An unexpected error occurred' });
        }
    }, LocationPassProps);
    return app;
}