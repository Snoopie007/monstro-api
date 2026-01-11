import { db } from "@/db/db";
import { Elysia, t } from "elysia";
import { memberPlansPkgRoutes } from "./pkg";
import { memberPlansSubRoutes } from "./sub";

const MemberPlansRootProps = {
    params: t.Object({
        pid: t.String(),
        mid: t.String(),
    }),
};
export const memberPlans = new Elysia({ prefix: '/plans/:pid' })
    .get('/invoices', async ({ status, params }) => {
        const { pid } = params;
        try {
            const invoices = await db.query.memberInvoices.findMany({
                where: (mi, { eq }) => eq(mi.memberSubscriptionId, pid),
                with: {
                    member: true,
                },
            });
            return status(200, invoices);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal Server Error" });
        }
    }, MemberPlansRootProps)
    .group('/family', (app) => {
        app.get('/', async ({ status, params }) => {
            const { pid } = params;
            try {
                let plans: { memberId: string }[] | undefined;
                if (pid.startsWith("sub")) {
                    plans = await db.query.memberSubscriptions.findMany({
                        where: (ms, { eq }) => eq(ms.parentId, pid),
                        with: {
                            member: true,
                        },
                    });
                } else {
                    plans = await db.query.memberPackages.findMany({
                        where: (mp, { eq }) => eq(mp.parentId, pid),
                        with: {
                            member: true,
                        },
                    });
                }
                if (!plans) {
                    return status(404, { error: "Plan not found" });
                }

                return status(200, plans);
            } catch (error) {
                console.error(error);
                return status(500, { error: "An error occurred" });
            }
        }, MemberPlansRootProps)
            .use(memberPlansPkgRoutes)
            .use(memberPlansSubRoutes)
        return app;

    })
