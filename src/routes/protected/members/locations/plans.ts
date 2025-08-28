import { db } from "@/db/db"
import { getTableColumns } from "drizzle-orm"
import { Elysia } from "elysia"
import { memberPackages, memberPlans, memberSubscriptions, reservations } from "@/db/schemas"
import { and, eq, sql } from "drizzle-orm"

type Props = {
    memberId: string
    params: {
        mid: string
        lid: string
    },
    status: any
}
export const mlPlansRoutes = new Elysia({ prefix: '/:lid/plans' })
    .get('/', async ({ memberId, params, status }: Props) => {
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
                .leftJoin(memberPlans, eq(memberPackages.memberPlanId, memberPlans.id))
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
                .leftJoin(memberPlans, eq(memberSubscriptions.memberPlanId, memberPlans.id))
                .leftJoin(reservations, eq(reservations.memberSubscriptionId, memberSubscriptions.id))
                .groupBy(memberSubscriptions.id, memberPlans.id)
                .execute();


            return status(200, [...pkgs, ...subs]);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal Server Error" });
        }
    })
