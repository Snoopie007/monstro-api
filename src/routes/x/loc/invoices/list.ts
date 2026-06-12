import { db } from "@/db/db";
import type Elysia from "elysia";
import { desc, eq, sql } from "drizzle-orm";
import { memberInvoices } from "@subtrees/schemas";

export async function listInvoiceRoutes(app: Elysia) {
    return app.get("/", async ({ params, query, status }) => {
        const { lid } = params as { lid: string };
        const { page, size } = query as { page?: string; size?: string };

        const pageSize = Math.min(100, Math.max(1, parseInt(size || "25", 10) || 25));
        const pageNumber = Math.max(1, parseInt(page || "1", 10) || 1);

        try {
            const whereCondition = eq(memberInvoices.locationId, lid);

            const [invoices, totalCountResult] = await Promise.all([
                db.query.memberInvoices.findMany({
                    where: whereCondition,
                    columns: {
                        id: true,
                        description: true,
                        status: true,
                        total: true,
                        tax: true,
                        currency: true,
                        dueDate: true,
                        paymentType: true,
                        invoiceType: true,
                        created: true,
                    },
                    with: {
                        member: {
                            columns: {
                                id: true,
                                firstName: true,
                                lastName: true,
                            },
                        },
                    },
                    orderBy: [desc(memberInvoices.created), desc(memberInvoices.id)],
                    limit: pageSize,
                    offset: (pageNumber - 1) * pageSize,
                }),
                db
                    .select({ count: sql<number>`count(*)` })
                    .from(memberInvoices)
                    .where(whereCondition),
            ]);

            return status(200, {
                count: Number(totalCountResult[0]?.count ?? 0),
                invoices,
            });
        } catch (error) {
            console.error("Error fetching invoices:", error);
            return status(500, { error: "Failed to fetch invoices" });
        }
    });
}
