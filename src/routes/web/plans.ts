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
    });