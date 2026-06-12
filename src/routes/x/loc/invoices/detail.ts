import { db } from "@/db/db";
import type Elysia from "elysia";
import { and, eq } from "drizzle-orm";

export async function detailInvoiceRoutes(app: Elysia) {
    return app.get("/:iid", async ({ params, status }) => {
        const { lid, iid } = params as { lid: string; iid: string };

        try {
            const invoice = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(eq(inv.id, iid), eq(inv.locationId, lid)),
                with: {
                    member: {
                        columns: {
                            id: true,
                            firstName: true,
                            lastName: true,
                            email: true,
                            phone: true,
                        },
                    },
                },
            });

            if (!invoice) {
                return status(404, { error: "Invoice not found" });
            }

            return status(200, { invoice });
        } catch (error) {
            console.error("Error fetching invoice:", error);
            return status(500, { error: "Failed to fetch invoice" });
        }
    });
}
