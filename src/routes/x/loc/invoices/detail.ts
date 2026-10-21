import { db } from "@/db/db";
import type Elysia from "elysia";
import { and, eq } from "drizzle-orm";
import { hasLocationPermissions } from "@/utils/locationAccess";

export async function detailInvoiceRoutes(app: Elysia) {
    return app.get("/:iid", async (ctx) => {
        const { params, status } = ctx;
        const { lid, iid } = params as { lid: string; iid: string };
        if (!await hasLocationPermissions(lid, ctx, ["view billing"])) return status(403, { error: "Forbidden", code: "FORBIDDEN" });

        try {
            const invoice = await db.query.memberInvoices.findFirst({
                where: (inv, { and, eq }) => and(eq(inv.id, iid), eq(inv.locationId, lid)),
                with: {
                    location: { columns: { timezone: true } },
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
