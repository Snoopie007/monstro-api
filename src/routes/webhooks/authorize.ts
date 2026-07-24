import { eq } from "drizzle-orm";
import { Elysia } from "elysia";

import { db } from "@/db/db";
import { memberInvoices, transactions } from "@subtrees/schemas";


type AuthorizeWebhookEvent = {
    eventType?: string;
    payload?: {
        id?: string;
        entityName?: string;
        responseCode?: string | number;
        authAmount?: string | number;
    };
};

export function authorizeWebhookRoutes(app: Elysia) {
    app.post("/authorize", async ({ request, status }) => {
        if (process.env.BUN_ENV === "production" || process.env.NODE_ENV === "production") {
            return status(404, { error: "Temporary Authorize.net webhook is disabled in production" });
        }

        let event: AuthorizeWebhookEvent;
        try {
            event = JSON.parse(Buffer.from(await request.arrayBuffer()).toString("utf8"));
        } catch {
            return status(400, { error: "Invalid Authorize.net payload" });
        }
        if (
            event.eventType !== "net.authorize.payment.authcapture.created"
            || event.payload?.entityName !== "transaction"
            || String(event.payload.responseCode) !== "1"
        ) {
            return status(200, { message: "Authorize.net event ignored" });
        }

        const paymentIntentId = event.payload.id;
        if (!paymentIntentId) {
            return status(400, { error: "Authorize.net transaction ID is missing" });
        }
        const transaction = await db.query.transactions.findFirst({
            where: eq(transactions.paymentIntentId, paymentIntentId),
        });
        if (!transaction) {
            return status(200, { message: "Authorize.net transaction not found" });
        }

        const amount = Number(event.payload.authAmount);
        if (!Number.isFinite(amount) || Math.round(amount * 100) !== transaction.total) {
            return status(400, { error: "Authorize.net amount does not match" });
        }

        await db.transaction(async (tx) => {
            await tx.update(transactions).set({
                status: "paid",
                updated: new Date(),
            }).where(eq(transactions.id, transaction.id));

            const invoice = await tx.query.memberInvoices.findFirst({
                where: eq(memberInvoices.transactionId, transaction.id),
                columns: { id: true },
            });
            if (invoice) {
                await tx.update(memberInvoices).set({
                    status: "paid",
                    paid: true,
                    paymentType: "card",
                    updated: new Date(),
                }).where(eq(memberInvoices.id, invoice.id));
            }
        });

        return status(200, { message: "Authorize.net event processed" });
    }, { parse: "none" });
    return app;
}
