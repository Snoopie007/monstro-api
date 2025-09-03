import { db } from "@/db/db"
import { getTableColumns } from "drizzle-orm"
import { Elysia } from "elysia"

type Props = {
    memberId: string
    params: {
        mid: string
        lid: string
    },
    status: any
}

export function mlReferralsRoutes(app: Elysia) {
    return app.get('/referrals', async ({ params, status }: Props) => {
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
    })
}
