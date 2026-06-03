import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { db } from "@/db/db";
import type { MemberPlan, MemberPlanPricing } from "@subtrees/types";
import { eq } from "drizzle-orm";
import { memberContracts } from "@subtrees/schemas";
import { generatePDF } from "@/utils/generatePDF";
import { type } from "os";


export const webDocRoutes = new Elysia({ prefix: "/docs" })
    .use(WebAuthMiddleware)
    .get('/unsigned', async ({ lid, status, session, params }) => {
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "No session provided" });
        }

        const { user } = session;
        const mid = user?.memberId;

        try {
            const unsignedDocs = await db.query.memberContracts.findMany({
                where: (m, { eq, and, isNull }) => and(
                    eq(m.memberId, mid),
                    eq(m.locationId, lid),
                    isNull(m.signedOn),
                ),
                with: {
                    contractTemplate: true,
                },
            });

            return status(200, unsignedDocs);

        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch contract" });
        }


    })
    .get('/:docId/variables', async ({ lid, status, session, params }) => {
        const { docId } = params;
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "No session provided" });
        }
        const { user } = session;
        const mid = user?.memberId;
        try {
            const doc = await db.query.memberContracts.findFirst({
                where: (m, { eq }) => eq(m.id, docId),
                with: {
                    member: true,
                    location: true,
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                },
            });

            let variables: Record<string, any> = {
                location: doc?.location,
                member: doc?.member,
            };
            if (doc?.pricing) {
                const { plan, ...rest } = doc.pricing;
                variables["plan"] = {
                    name: plan.name,
                    price: rest.price,
                    interval: `${rest.interval} ${rest.intervalThreshold}`,
                    pricingName: rest.name,
                };
            }

            return status(200, variables);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch contract" });
        }

    }, {
        params: t.Object({
            docId: t.String(),
        }),
    })
    .patch('/:docId', async ({ body, status, params, session, lid }) => {
        const { docId } = params;
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "No session provided" });
        }
        const { user } = session;
        const mid = user?.memberId;
        try {

            const member = await db.query.members.findFirst({
                where: (m, { eq }) => eq(m.id, mid),
            });
            if (!member) {
                return status(404, { message: "Member not found" });
            }

            const [mc] = await db.update(memberContracts).set({
                signature: body.signature,
                signedOn: new Date(),
            }).where(eq(memberContracts.id, docId)).returning()


            if (!mc) {
                return status(404, { message: "Contract not found" });
            }

            let pricing: MemberPlanPricing | null = null;
            const pricingId = mc.pricingId;
            if (pricingId) {
                const p = await db.query.memberPlanPricing.findFirst({
                    where: (p, { eq }) => eq(p.id, pricingId),
                    with: {
                        plan: true,
                    },
                });
                if (p) {
                    pricing = p;
                }
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
                generatePDF({
                    memberContractId: docId,
                    member,
                    template: template,
                    pricing,
                });
            }, 1000);
            return status(200, { message: "Contract signed successfully" });
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch contract" });
        }
    }, {
        params: t.Object({
            docId: t.String(),
        }),
        body: t.Object({
            signature: t.String(),
        }),
    })