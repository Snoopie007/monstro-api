import { db } from "@/db/db";
import { Elysia } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";


export async function getLocationPlans(locationId: string) {
    const plans = await db.query.memberPlans.findMany({
        where: (plans, { eq, and, not }) => and(
            eq(plans.locationId, locationId),
            eq(plans.archived, false),
            not(eq(plans.type, "pass")),
        ),
        with: {
            contract: {
                columns: {
                    id: true,
                    title: true,
                    requireSignature: true,
                    locationId: true,
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
                            locationId: true,
                            status: true,
                        },
                    },
                },
            },
            pricings: true,
        },
    });

    return plans.map(plan => {
        const { planPrograms, pricings, contract, contractId, ...rest } = plan;
        const programs = planPrograms.flatMap(({ program }) => {
            if (!program || program.locationId !== locationId || program.status !== "active") {
                return [];
            }
            const { locationId: _locationId, status: _status, ...publicProgram } = program;
            return [publicProgram];
        });
        const scopedContract = contract
            ? contract.locationId === locationId
                ? (({ locationId: _locationId, ...publicContract }) => publicContract)(contract)
                : null
            : contract;
        const minAges = programs.map(p => p.minAge);
        const maxAges = programs.map(p => p.maxAge);
        const minAge = minAges.length ? Math.min(...minAges) : 0;
        const maxAge = maxAges.length ? Math.max(...maxAges) : 0;
        const prices = pricings.map(p => p.price);
        const minPrice = prices.length ? Math.min(...prices) : 0;

        return {
            ...rest,
            contractId: scopedContract ? contractId : null,
            contract: scopedContract,
            programs,
            startingPrice: minPrice,
            pricings,
            ageRange: { min: minAge, max: maxAge },
        };
    });
}

export const webPlansRoutes = new Elysia({ prefix: "/plans" })
    .use(WebAuthMiddleware)
    .get('/', async ({ status, lid }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }

        try {
            return status(200, await getLocationPlans(lid));
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch products" });
        }
    })
    .group('/:planId', (app) => {
        app.get('/docs', async ({ params, status, lid }) => {
            const { planId } = params;
            if (!lid) {
                return status(401, { message: "No Location ID provided" });
            }
            try {
                const plan = await db.query.memberPlans.findFirst({
                    where: (plans, { eq, and }) => and(
                        eq(plans.id, planId),
                        eq(plans.locationId, lid),
                        eq(plans.archived, false),
                    ),
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