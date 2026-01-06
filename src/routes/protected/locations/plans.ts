
import type { Elysia } from "elysia";
import { z } from "zod";
import { db } from "@/db/db";
const LocationPlansProps = {
    params: z.object({
        lid: z.string(),
    }),
};

export async function locationPlans(app: Elysia) {
    return app.get('/plans', async ({ params, status }) => {
        const { lid } = params;

        try {

            const plans = await db.query.memberPlans.findMany({
                where: (plans, { eq }) => eq(plans.locationId, lid),
                with: {
                    planPrograms: {
                        with: {
                            program: true,
                        },
                    },
                    pricingOptions: true,
                },
            });
            const mappedPlans = plans.map(plan => {
                const { planPrograms, pricingOptions, ...rest } = plan
                const programs = planPrograms.map(pp => pp.program);

                // Get all numeric minAge and maxAge values from programs
                const minAges = programs.map(p => p.minAge)
                const maxAges = programs.map(p => p.maxAge)

                const minAge = minAges.length ? Math.min(...minAges) : 0;
                const maxAge = maxAges.length ? Math.max(...maxAges) : 0;

                const prices = pricingOptions.map(p => p.price);
                const minPrice = prices.length ? Math.min(...prices) : 0;

                return {
                    ...rest,
                    programs,
                    startingPrice: minPrice,
                    prices: pricingOptions,
                    ageRange: { min: minAge, max: maxAge },
                };
            });
            return status(200, mappedPlans);
        } catch (err) {
            console.error("Error getting plans:", err);
            return status(500, { error: "Failed to get plans" });
        }
    }, LocationPlansProps)
}   
