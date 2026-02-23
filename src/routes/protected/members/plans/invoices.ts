import { db } from "@/db/db";
import { Elysia, t } from "elysia";


export function memberPlansInvoicesRoutes(app: Elysia) {
    return app.get('/invoices', async ({ params, status }) => {
        const { pid } = params;
        try {
            const invoices = await db.query.memberInvoices.findMany({
                where: (memberInvoices, { eq }) => eq(memberInvoices.memberPlanId, pid),

            });


            return status(200, invoices);
        } catch (error) {
            console.error(error);
            return status(500, { error: "Internal Server Error" });
        }
    }, {
        params: t.Object({
            mid: t.String(),
            pid: t.String(),
        }),
    });
}