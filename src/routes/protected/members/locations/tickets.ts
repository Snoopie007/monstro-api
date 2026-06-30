import { db } from "@/db/db";
import { Elysia, t } from "elysia";

const MemberLocationPassesProps = {
    params: t.Object({
        mid: t.String(),
        lid: t.String(),
    }),
};
export function memberLocationTicketsRoutes(app: Elysia) {
    return app.get('/tickets', async ({ params, status }) => {
        const { mid, lid } = params;
        try {
            const tickets = await db.query.eventRegistrations.findMany({
                where: (er, { eq, and }) => and(eq(er.memberId, mid), eq(er.locationId, lid)),
                with: {
                    event: true,
                    ticket: {
                        columns: {
                            id: true,
                            name: true,
                            price: true,
                            pricingMethod: true,
                        },
                    },
                },
            });
            return status(200, tickets);
        } catch (error) {
            console.error(error);
            return status(500, { error: 'Internal server error' });
        }
    }, MemberLocationPassesProps);
}