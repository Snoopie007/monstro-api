import { db } from "@/db/db";
import { Elysia } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";


export const webPlansRoutes = new Elysia({ prefix: "/plans" })
    .use(WebAuthMiddleware)
    .get('/', async ({ status, lid }) => {

        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }

        try {
            const plans = await db.query.memberPlans.findMany({
                where: (plans, { eq, and, not }) => and(eq(plans.locationId, lid), not(eq(plans.type, "pass"))),
                with: {
                    contract: {
                        columns: {
                            id: true,
                            title: true,
                            requireSignature: true,
                        },
                    },
                    planPrograms: {
                        with: {
                            program: {
                                columns: {
                                    id: true,
                                    name: true,
                                    minAge: true,
                                    maxAge: true,
                                    icon: true,
                                    capacity: true,
                                    description: true,
                                },
                            },
                        },
                    },
                    pricings: true,
                },
            });
            const mappedPlans = plans.map(plan => {
                const { planPrograms, pricings, ...rest } = plan
                const programs = planPrograms.map(pp => pp.program);

                // Get all numeric minAge and maxAge values from programs
                const minAges = programs.map(p => p.minAge)
                const maxAges = programs.map(p => p.maxAge)

                const minAge = minAges.length ? Math.min(...minAges) : 0;
                const maxAge = maxAges.length ? Math.max(...maxAges) : 0;

                const prices = pricings.map(p => p.price);
                const minPrice = prices.length ? Math.min(...prices) : 0;

                return {
                    ...rest,
                    programs,
                    startingPrice: minPrice,
                    pricings,
                    ageRange: { min: minAge, max: maxAge },
                };
            });
            return status(200, mappedPlans);

        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch products" });
        }
    })
    .group('/:planId', (app) => {
        app.get('/docs', async ({ params, status }) => {
            const { planId } = params;
            try {
                const plan = await db.query.memberPlans.findFirst({
                    where: (plans, { eq }) => eq(plans.id, planId),
                    with: {
                        contract: true,
                    },
                });
                if (!plan) {
                    return status(404, { error: "Plan not found" });
                }

                return status(200, {});
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch plan" });
            }

        });
        return app;
    });