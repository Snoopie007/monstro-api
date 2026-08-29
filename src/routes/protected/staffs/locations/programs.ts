import { db } from "@/db/db";
import { findOverlappingLocationClosure } from "@subtrees/utils";
import { memberPlanPricing, planPrograms } from "@subtrees/schemas";
import { addDays, addMinutes, endOfDay, startOfWeek } from "date-fns";
import { fromZonedTime } from "date-fns-tz";
import { eq } from "drizzle-orm";
import { Elysia, t } from "elysia";

const memberColumns = {
    id: true,
    firstName: true,
    lastName: true,
    email: true,
    phone: true,
} as const;

const pricingColumns = {
    id: true,
    name: true,
    price: true,
} as const;

export const slProgramRoutes = new Elysia({ prefix: "/programs" })

    .group("/:programId", (app) => {
        app.get("/members/plans", async ({ params, status }) => {
            const { programId } = params;

            try {
                const pricingIdsForProgram = db
                    .select({ id: memberPlanPricing.id })
                    .from(memberPlanPricing)
                    .innerJoin(
                        planPrograms,
                        eq(planPrograms.planId, memberPlanPricing.memberPlanId),
                    )
                    .where(eq(planPrograms.programId, programId));

                const [subscriptions, packages] = await Promise.all([
                    db.query.memberSubscriptions.findMany({
                        where: (s, { and, eq: eqCol, inArray, isNull }) => and(
                            inArray(s.memberPlanPricingId, pricingIdsForProgram),
                            eqCol(s.status, "active"),
                            isNull(s.parentId),
                        ),
                        with: {
                            member: { columns: memberColumns },
                            pricing: { columns: pricingColumns },
                            reservations: {
                                where: (r, { and, eq: eqCol, inArray }) => and(
                                    eqCol(r.programId, programId),
                                    inArray(r.status, ["confirmed", "completed"]),
                                ),
                                columns: { id: true },
                            },
                        },
                    }),
                    db.query.memberPackages.findMany({
                        where: (p, { and, eq: eqCol, inArray, isNull }) => and(
                            inArray(p.memberPlanPricingId, pricingIdsForProgram),
                            eqCol(p.status, "active"),
                            isNull(p.parentId),
                        ),
                        with: {
                            member: { columns: memberColumns },
                            pricing: { columns: pricingColumns },
                        },
                    }),
                ]);

                return status(200, [...subscriptions, ...packages]);
            } catch (error) {
                console.error(error);
                return status(500, { error: "Failed to fetch program" });
            }
        }, {
            params: t.Object({
                programId: t.String(),
                staffId: t.String(),
                lid: t.String(),
            }),
        });
        return app;
    });
