import { db } from "@/db/db";
import Elysia, { t } from "elysia";

export const publicFamilyRoutes = new Elysia({ prefix: '/family' })
    .get('/:ficode/validate', async ({ params, status }) => {
        const { ficode } = params;
        try {
            const member = await db.query.members.findFirst({
                where: (members, { eq }) => eq(members.familyInviteCode, ficode),
                columns: {
                    id: true,
                    firstName: true,
                    lastName: true,
                }
            });
            if (!member) {
                return status(404, { error: "Family not found" });
            }
            return status(200, member);
        } catch (error) {
            console.error("Failed to validate family", error);
            return status(500, { error: "Failed to validate family" });
        }
    }, {
        params: t.Object({
            ficode: t.String(),
        }),
    });