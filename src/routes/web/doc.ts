import { Elysia, t } from "elysia";
import { WebAuthMiddleware } from "@/middlewares/WebAuthMW";
import { db } from "@/db/db";
import type { MemberPlanPricing } from "@subtrees/types";
import { and, eq } from "drizzle-orm";
import { memberContracts } from "@subtrees/schemas";
import { generatePDF } from "@/utils/generatePDF";
import { renderContractContent } from "@/utils/contractUtils";

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
        if (!mid) {
            return status(401, { message: "No member provided" });
        }

        try {
            const unsignedDocs = await db.query.memberContracts.findMany({
                where: (m, { eq, and, isNull }) => and(
                    eq(m.memberId, mid),
                    eq(m.locationId, lid),
                    isNull(m.signedOn),
                ),
                with: {
                    contractTemplate: {
                        with: {
                            location: {
                                columns: {
                                    id: true,
                                },
                            },
                        },
                    },
                    pricing: {
                        with: {
                            plan: {
                                columns: {
                                    locationId: true,
                                },
                            },
                        },
                    },
                },
            });

            const scopedUnsignedDocs = unsignedDocs.flatMap((doc) => {
                if (
                    doc.contractTemplate?.location?.id !== lid ||
                    (doc.pricing && doc.pricing.plan?.locationId !== lid)
                ) {
                    return [];
                }

                const { contractTemplate, pricing: _pricing, ...rest } = doc;
                if (!contractTemplate) return [];
                const { location: _location, ...publicContractTemplate } = contractTemplate;
                return [{ ...rest, contractTemplate: publicContractTemplate }];
            });

            return status(200, scopedUnsignedDocs);

        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch contract" });
        }


    })
    .get('/:docId/content', async ({ lid, status, session, params }) => {
        const { docId } = params;
        if (!lid) {
            return status(401, { message: "No Location ID provided" });
        }
        if (!session) {
            return status(401, { message: "No session provided" });
        }
        const mid = session.user?.memberId;
        if (!mid) {
            return status(401, { message: "No member provided" });
        }
        try {
            const doc = await db.query.memberContracts.findFirst({
                where: (m, { eq, and }) => and(
                    eq(m.id, docId),
                    eq(m.memberId, mid),
                    eq(m.locationId, lid),
                ),
                with: {
                    contractTemplate: {
                        with: {
                            location: true,
                        },
                    },
                    member: true,
                    location: true,
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                },
            });

            if (
                !doc ||
                doc.contractTemplate?.location?.id !== lid ||
                (doc.pricing && doc.pricing.plan?.locationId !== lid)
            ) {
                return status(404, { error: "Contract not found" });
            }

            const mdx = renderContractContent(doc.contractTemplate.content, {
                location: doc.location,
                member: doc.member,
                pricing: doc.pricing,
            });
            return status(200, { mdx });
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
        if (!mid) {
            return status(401, { message: "No member provided" });
        }
        try {
            const member = await db.query.members.findFirst({
                where: (m, { eq }) => eq(m.id, mid),
            });
            if (!member) {
                return status(404, { message: "Member not found" });
            }

            const doc = await db.query.memberContracts.findFirst({
                where: (mc, { eq, and }) => and(
                    eq(mc.id, docId),
                    eq(mc.memberId, mid),
                    eq(mc.locationId, lid),
                ),
                with: {
                    contractTemplate: {
                        with: {
                            location: true,
                        },
                    },
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                },
            });
            if (!doc) {
                return status(404, { message: "Contract not found" });
            }
            if (!doc.contractTemplate || doc.contractTemplate.location?.id !== lid) {
                return status(404, { message: "Template not found" });
            }
            if (doc.pricing && doc.pricing.plan?.locationId !== lid) {
                return status(404, { message: "Pricing not found" });
            }

            const [mc] = await db.update(memberContracts).set({
                signature: body.signature,
                signedOn: new Date(),
            }).where(and(
                eq(memberContracts.id, docId),
                eq(memberContracts.memberId, mid),
                eq(memberContracts.locationId, lid),
            )).returning();

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
                if (p?.plan?.locationId === lid) {
                    pricing = p;
                }
            }

            const template = await db.query.contractTemplates.findFirst({
                where: (ct, { eq, and }) => and(
                    eq(ct.id, mc.templateId),
                    eq(ct.locationId, lid),
                ),
                with: {
                    location: true,
                },
            });
            if (!template) {
                return status(404, { message: "Template not found" });
            }
            //Generate PDF
            setTimeout(() => {
                const content = renderContractContent(template.content, {
                    location: template.location,
                    member,
                    pricing,
                });

                generatePDF({
                    did: docId,
                    mid: member.id,
                    lid,
                    title: template.title,
                    content,
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