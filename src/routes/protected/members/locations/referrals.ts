import { db } from "@/db/db"
import { Elysia } from "elysia"
import { z } from "zod";
const MemberLocationReferralsProps = {
    params: z.object({
        mid: z.string(),
        lid: z.string(),
    }),
};


export function mlReferralsRoutes(app: Elysia) {
    return app.get('/referrals', async ({ params, status }) => {
        const { mid, lid } = params;
        try {

            const referrals = await db.query.memberReferrals.findMany({
                where: (r, { eq, and }) => and(eq(r.locationId, lid), eq(r.memberId, mid)),
                with: {
                    referredMember: {
                        columns: {
                            id: true,
                            avatar: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        }
                    }
                },
            });




            return status(200, referrals);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Failed to fetch achievements" });
        }
    }, MemberLocationReferralsProps)
}
