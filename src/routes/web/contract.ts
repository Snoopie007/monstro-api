import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { db } from "@/db/db";
import type { MemberPlan, MemberPlanPricing } from "@subtrees/types";
import { eq } from "drizzle-orm";
import { memberContracts } from "@subtrees/schemas";
import { generatePDF } from "@/utils/generatePDF";
type ContractTemplatePricing = Pick<
    MemberPlanPricing,
    "id" | "name" | "price" | "interval" | "intervalThreshold"
> & {
    plan: Pick<MemberPlan, "id" | "name">;
};




export const webContractRoutes = new Elysia({ prefix: "/contract" })
    .use(WebAuthMiddleware)
    .get('/:mcid', async ({ lid, status, session, params }) => {
        const { mcid } = params;
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "No session provided" });
        }


        try {
            const mc = await db.query.memberContracts.findFirst({
                where: (m, { eq }) => eq(m.id, mcid),
                with: {
                    contractTemplate: {
                        columns: {
                            id: true,
                            title: true,
                            content: true,
                            requireSignature: true,
                            type: true,
                            isDraft: true,
                        },
                    },
                },
            });
            if (!mc) {
                return status(404, { message: "Contract not found" });
            }

            let pricing: ContractTemplatePricing | undefined;
            if (mc.contractTemplate?.type === 'contract') {
                const planId = mc.memberPlanId;
                if (planId) {
                    if (planId.startsWith("sub_")) {
                        const sub = await db.query.memberSubscriptions.findFirst({
                            where: (ms, { eq }) => eq(ms.id, planId),
                            columns: { memberPlanPricingId: true },
                            with: {
                                pricing: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        price: true,
                                        interval: true,
                                        intervalThreshold: true,
                                    },
                                    with: {
                                        plan: {
                                            columns: {
                                                id: true,
                                                name: true,
                                            },
                                        },
                                    },
                                },
                            }
                        });
                        if (sub?.pricing) {
                            pricing = sub.pricing;
                        }
                    } else {
                        const pkg = await db.query.memberPackages.findFirst({
                            where: (mp, { eq }) => eq(mp.id, planId),
                            columns: { memberPlanPricingId: true },
                            with: {
                                pricing: {
                                    columns: {
                                        id: true,
                                        name: true,
                                        price: true,
                                        interval: true,
                                        intervalThreshold: true,
                                    },
                                    with: {
                                        plan: {
                                            columns: {
                                                id: true,
                                                name: true,
                                            },
                                        },
                                    },
                                },
                            },
                        });
                        if (pkg?.pricing) {
                            pricing = pkg.pricing;
                        }
                    }
                }
            }
            const [firstname, lastname] = session.user?.name?.split(" ");
            const variables: Record<string, any> = {
                member: {
                    firstName: firstname,
                    lastName: lastname,
                    email: session.user?.email,
                },
                ...(pricing && pricing.plan && {
                    plan: {
                        name: pricing.plan.name,
                        pricingName: pricing.name,
                        price: pricing.price,
                        interval: pricing.interval,
                        intervalThreshold: pricing.intervalThreshold,
                    },
                }),
            }

            return status(200, { mc, variables });

        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch contract" });
        }


    }, {
        params: t.Object({
            mcid: t.String(),
        }),
    })
    .post('/:mcid/sign', async ({ body, status, params, session, lid }) => {
        const { mcid } = params;
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "No session provided" });
        }

        try {
            const [mc] = await db.update(memberContracts).set({
                signature: body.signature,
                signedOn: new Date(),
            }).where(eq(memberContracts.id, mcid)).returning({
                memberPlanId: memberContracts.memberPlanId,
                templateId: memberContracts.templateId,
            });
            if (!mc) {
                return status(404, { message: "Contract not found" });
            }

            const template = await db.query.contractTemplates.findFirst({
                where: (ct, { eq }) => eq(ct.id, mc.templateId),

                with: {
                    location: true,
                },
            });
            if (!template) {
                return status(404, { message: "Template not found" });
            }
            //Generate PDF
            setTimeout(() => {
                // generatePDF({
                //     memberContractId: mcid,
                //     member: {
                //         id: session.user?.id,
                //         firstName: session.user?.name?.split(" ")[0],
                //         lastName: session.user?.name?.split(" ")[1],
                //         email: session.user?.email,
                //         phone: "",
                //     },
                //     template: template,
                //     pricing: {
                //         id: "",
                //         name: "",
                //         price: 0,
                //         interval: "",
                //         intervalThreshold: "",
                //     },
                // });
            }, 1000);
            return status(200, { message: "Contract signed successfully" });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch contract" });
        }
    }, {
        params: t.Object({
            mcid: t.String(),
        }),
        body: t.Object({
            signature: t.String(),
        }),
    })