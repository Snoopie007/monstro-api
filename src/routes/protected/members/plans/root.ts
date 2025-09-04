import { db } from "@/db/db";
import type { MemberPackage, MemberSubscription } from "@/types/member";
import { Elysia } from "elysia";
import { memberPlansPkgRoutes } from "./pkg";
import { memberPlansSubRoutes } from "./sub";


export const memberPlans = new Elysia({ prefix: '/plans/:pid' })
    .get('/', async ({ status, params }) => {
        const { pid } = params as { pid: string };

        try {
            let plans: MemberSubscription | MemberPackage | undefined;

            if (pid.startsWith("sub")) {
                plans = await db.query.memberSubscriptions.findFirst({
                    where: (subscriptions, { eq }) => eq(subscriptions.id, pid),
                    with: {
                        plan: {
                            with: {
                                planPrograms: {
                                    with: {
                                        program: true,
                                    },
                                },
                            },
                        },
                        invoices: true,
                    },
                });
            } else {
                plans = await db.query.memberPackages.findFirst({
                    where: (packages, { eq }) => eq(packages.id, pid),
                    with: {
                        plan: {
                            with: {
                                planPrograms: {
                                    with: {
                                        program: true,
                                    },
                                },
                            },
                        },
                        invoices: true,
                    },
                });
            }
            return status(200, plans || []);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal Server Error" });
        }
    })
    .group('/family', (app) => {
        return app.get('/', async ({ status, params }) => {
            const { pid } = params as { pid: string };
            try {
                let plans: { memberId: string }[] | undefined;
                if (params.pid.startsWith("sub")) {
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
        }).use(memberPlansPkgRoutes).use(memberPlansSubRoutes);

    })
