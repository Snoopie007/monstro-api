import { db } from "@/db/db";
import { Elysia, t } from "elysia";


export const publicPassRoutes = new Elysia({ prefix: '/pass' })
    .get('/:passId', async ({ params, status }) => {
        const { passId } = params;
        try {
            const pass = await db.query.memberPasses.findFirst({
                where: (memberPasses, { eq }) => eq(memberPasses.id, passId),
                with: {
                    referrer: {
                        columns: {
                            id: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                    location: {
                        columns: {
                            id: true,
                            name: true,
                            logoUrl: true,
                        },
                    },
                    plan: {
                        columns: {
                            id: true,
                            name: true,
                            description: true,
                        },
                    },
                },
            });
            if (!pass) {
                return status(404, { error: "Pass not found" });
            }
            return status(200, pass);
        } catch (error) {
            console.error("Failed to get pass", error);
            return status(500, { error: "Failed to get pass" });
        }
    }, {
        params: t.Object({
            passId: t.String(),
        }),
    });