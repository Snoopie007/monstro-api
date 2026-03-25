import { Elysia, t } from "elysia";
import { db } from "@/db/db";
import { memberLocations, memberPackages, memberPasses } from "@subtrees/schemas";
import { calculateThresholdDate } from "@/utils";
import { eq } from "drizzle-orm";

const LocationPassProps = {
    params: t.Object({
        lid: t.String(),
        passId: t.String(),
    }),
    body: t.Object({
        memberId: t.String(),
    }),
};

export function locationPass(app: Elysia) {
    app.group('/passes/:passId', (app) => {

        app.post('/claim', async ({ params, body, status }) => {
            const { lid, passId } = params;
            const { memberId } = body;

            try {
                const pass = await db.query.memberPasses.findFirst({
                    where: (memberPasses, { eq }) => eq(memberPasses.id, passId),
                });
                if (!pass) {
                    return status(404, {
                        error: 'PASS_NOT_FOUND',
                        message: 'This pass does not exist.'
                    });
                }
                if (pass.claimedBy) {
                    return status(400, {
                        error: 'PASS_ALREADY_CLAIMED',
                        message: 'This pass has already been claimed.'
                    });
                }
                if (pass.referrerId !== memberId) {
                    return status(400, {
                        error: 'CANNOT_CLAIM',
                        message: 'Nice try, but you cannot claim your own pass.'
                    });
                }

                // Typo fix: reference to memberPlans in query - import if necessary
                const plan = await db.query.memberPlans.findFirst({
                    where: (memberPlans, { eq }) => eq(memberPlans.id, pass.planId),
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
                    return status(400, { error: 'You already used this pass before.' });
                }


                // Wrap transaction correctly and use the passed-in connection
                const pkg = await db.transaction(async (tx) => {

                    await tx.insert(memberLocations).values({
                        memberId,
                        locationId: lid,
                        status: 'trialing',
                    }).onConflictDoNothing({
                        target: [memberLocations.memberId, memberLocations.locationId],
                    });

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

                    await tx.update(memberPasses).set({
                        claimedBy: memberId,
                        claimedOn: new Date(),
                    }).where(eq(memberPasses.id, passId));
                    return insertedPackages;
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
    })



    return app;
}