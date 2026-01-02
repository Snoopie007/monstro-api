
import type { Elysia } from "elysia";
import { z } from "zod";
import { db } from "@/db/db";
import { memberPlans, planPrograms, programs } from "@/db/schemas";
import { eq, getTableColumns } from "drizzle-orm";

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
                },
            });
            const mappedPlans = plans.map(plan => {
                const programs = plan.planPrograms.map(pp => pp.program);

                // Get all numeric minAge and maxAge values from programs
                const minAges = programs
                    .map(p => typeof p.minAge === 'number' ? p.minAge : null)
                    .filter((a): a is number => a !== null);
                const maxAges = programs
                    .map(p => typeof p.maxAge === 'number' ? p.maxAge : null)
                    .filter((a): a is number => a !== null);

                const minAge = minAges.length ? Math.min(...minAges) : null;
                const maxAge = maxAges.length ? Math.max(...maxAges) : null;

                return {
                    ...plan,
                    programs,
                    ageRange: (minAge !== null && maxAge !== null) ? { min: minAge, max: maxAge } : null,
                };
            });

            return status(200, plans);
        } catch (err) {
            console.error("Error getting plans:", err);
            return status(500, { error: "Failed to get plans" });
        }
    }, LocationPlansProps)
}   