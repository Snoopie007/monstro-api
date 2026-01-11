import { db } from "@/db/db"
import { getTableColumns } from "drizzle-orm"
import { Elysia, t } from "elysia"
import {
    memberPackages, memberPlanPricing, memberPlans, memberSubscriptions,
    reservations
} from "@/db/schemas"
import { and, eq, sql, } from "drizzle-orm"
import type { Program } from "@/types/program"


export function mlPlansRoutes(app: Elysia) {
    return app.get('/plans', async ({ params, status }) => {
        const { mid, lid } = params;
        try {
            const plans = await Promise.all([
                queryMemberPlans(
                    memberPackages,
                    mid,
                    lid,
                ),
                queryMemberPlans(
                    memberSubscriptions,
                    mid,
                    lid,
                ),
            ]);

            const flatPlans = plans.flat();
            const planIds = [...new Set(flatPlans.map(item => item.plan.id))];

            // Fetch planPrograms for all plans
            const planProgramsList = await db.query.planPrograms.findMany({
                where: (pp, { inArray }) => inArray(pp.planId, planIds),
                with: {
                    program: true,

                },
            });

            // Group planPrograms by planId
            const programListMap = new Map<string, Program[]>();
            planProgramsList.forEach(pp => {
                const existing = programListMap.get(pp.planId) || [];
                existing.push(pp.program);
                programListMap.set(pp.planId, existing);
            });

            // Map programs to plans
            const result = flatPlans.map(item => ({
                ...item,
                programs: programListMap.get(item.plan.id) || [],
                plan: {
                    ...item.plan,

                },
            }));
            return status(200, result);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal Server Error" });
        }
    }, {
        params: t.Object({
            mid: t.String(),
            lid: t.String(),
        }),
    })
}


// Helper function to query plans with common structure
async function queryMemberPlans(
    table: typeof memberPackages | typeof memberSubscriptions,
    mid: string,
    lid: string,
) {
    return db.select({
        ...getTableColumns(table),
        plan: {
            id: memberPlans.id,
            name: memberPlans.name,
            description: memberPlans.description,
            family: memberPlans.family,
            familyMemberLimit: memberPlans.familyMemberLimit,
            totalClassLimit: memberPlans.totalClassLimit,
            classLimitInterval: memberPlans.classLimitInterval,
        },
        pricing: {
            id: memberPlanPricing.id,
            name: memberPlanPricing.name,
            price: memberPlanPricing.price,
        },
        planId: memberPlans.id,
        reservationsCount: sql<number>`count(${reservations.id})`,
    })
        .from(table)
        .where(and(
            eq(table.memberId, mid),
            eq(table.locationId, lid)
        ))
        .innerJoin(memberPlanPricing, eq(table.memberPlanPricingId, memberPlanPricing.id))
        .innerJoin(memberPlans, eq(memberPlanPricing.memberPlanId, memberPlans.id))
        .leftJoin(reservations, eq(table.id, reservations.id))
        .groupBy(
            table.id,
            memberPlans.id,
            memberPlanPricing.id,
        )
        .execute();
}