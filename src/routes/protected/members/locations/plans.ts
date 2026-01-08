import { db } from "@/db/db"
import { getTableColumns } from "drizzle-orm"
import { Elysia } from "elysia"
import { memberPackages, memberPlanPricing, memberPlans, memberSubscriptions, reservations } from "@/db/schemas"
import { and, eq, sql } from "drizzle-orm"
import { z } from "zod";


const MemberLocationPlansProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
    }),
};

export function mlPlansRoutes(app: Elysia) {
    return app.get('/plans', async ({ params, status }) => {
        const { mid, lid } = params;
        try {
            const pkgs = await db.select({
                ...getTableColumns(memberPackages),
                plan: {
                    ...getTableColumns(memberPlans),
                },
                reservationsCount: sql<number>`count(${reservations.id})`,
            })
                .from(memberPackages)
                .where(and(eq(memberPackages.memberId, mid), eq(memberPackages.locationId, lid)))
                .innerJoin(memberPlanPricing, eq(memberPackages.memberPlanPricingId, memberPlanPricing.id))
                .innerJoin(memberPlans, eq(memberPlanPricing.memberPlanId, memberPlans.id))
                .leftJoin(reservations, eq(reservations.memberPackageId, memberPackages.id))
                .groupBy(memberPackages.id, memberPlans.id)
                .execute();

            const subs = await db.select({
                ...getTableColumns(memberSubscriptions),

                plan: {
                    ...getTableColumns(memberPlans),
                },
                reservationsCount: sql<number>`count(${reservations.id})`,
            })
                .from(memberSubscriptions)
                .where(and(eq(memberSubscriptions.memberId, mid), eq(memberSubscriptions.locationId, lid)))
                .innerJoin(memberPlanPricing, eq(memberSubscriptions.memberPlanPricingId, memberPlanPricing.id))
                .innerJoin(memberPlans, eq(memberPlanPricing.memberPlanId, memberPlans.id))
                .leftJoin(reservations, eq(reservations.memberSubscriptionId, memberSubscriptions.id))
                .groupBy(memberSubscriptions.id, memberPlans.id)
                .execute();


            return status(200, [...pkgs, ...subs]);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal Server Error" });
        }
    }, MemberLocationPlansProps)

}
