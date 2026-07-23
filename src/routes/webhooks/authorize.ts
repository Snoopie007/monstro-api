import { eq, sql } from "drizzle-orm";
import { Elysia } from "elysia";

import { db } from "@/db/db";
import { memberInvoices, transactions } from "@subtrees/schemas";


type AuthorizeWebhookEvent = {
    notificationId?: string;
    eventType?: string;
    webhookId?: string;
    payload?: {
        id?: string;
        entityName?: string;
        merchantReferenceId?: string;
        responseCode?: string | number;
        authAmount?: string | number;
    };
};

export function authorizeWebhookRoutes(app: Elysia) {
    app.post("/authorize", async ({ request, status }) => {
        if (process.env.BUN_ENV === "production" || process.env.NODE_ENV === "production") {
            return status(404, { error: "Temporary Authorize.net webhook is disabled in production" });
        }
        const rawBody = Buffer.from(await request.arrayBuffer());
        let event: AuthorizeWebhookEvent;
        try {
            event = JSON.parse(rawBody.toString("utf8"));
        } catch {
            return status(400, { error: "Invalid Authorize.net payload" });
        }
        console.log("[AUTHORIZE WEBHOOK] Received", {
            notificationId: event.notificationId,
            eventType: event.eventType,
            webhookId: event.webhookId,
            authorizeTransactionId: event.payload?.id,
            referenceId: event.payload?.merchantReferenceId,
        });
        if (
            event.eventType !== "net.authorize.payment.authcapture.created" ||
            event.payload?.entityName !== "transaction"
        ) {
            console.log("[AUTHORIZE WEBHOOK] Ignored event", event.eventType);
            return status(200, { message: "Authorize.net event ignored" });
        }

        const referenceId = event.payload.merchantReferenceId;
        if (!referenceId) {
            return status(400, { error: "Authorize.net merchant reference is missing" });
        }

        // The reference maps this provider event back to the local payment.
        const transaction = await db.query.transactions.findFirst({
            where: sql`${transactions.metadata}->>'authorizeReferenceId' = ${referenceId}`,
        });
        if (!transaction) {
            console.log("[AUTHORIZE WEBHOOK] No local transaction for reference", referenceId);
            return status(200, { message: "Authorize.net transaction not found" });
        }

        const integrationId = transaction.metadata?.authorizeIntegrationId;
        if (typeof integrationId !== "string") {
            console.log("[AUTHORIZE WEBHOOK] Local transaction has no integration reference", transaction.id);
            return status(400, { error: "Authorize.net integration reference is missing" });
        }

        const amount = Number(event.payload.authAmount);
        if (!Number.isFinite(amount) || Math.round(amount * 100) !== transaction.total) {
            console.log("[AUTHORIZE WEBHOOK] Amount mismatch", {
                referenceId,
                webhookAmount: event.payload.authAmount,
                localAmountInCents: transaction.total,
            });
            return status(400, { error: "Authorize.net amount does not match" });
        }

        console.log("[AUTHORIZE WEBHOOK] Matched payment", {
            notificationId: event.notificationId,
            authorizeTransactionId: event.payload.id,
            referenceId,
            localTransactionId: transaction.id,
            responseCode: event.payload.responseCode,
        });

        // TODO: fetch getTransactionDetails and update the local transaction status.
        console.log("[AUTHORIZE WEBHOOK] TODO update transaction", transaction.id);

        if (transaction.orderId) {
            // TODO: update the linked order after the transaction becomes paid or failed.
            console.log("[AUTHORIZE WEBHOOK] TODO update order", transaction.orderId);
        }

        const invoice = transaction.invoiceId
            ? await db.query.memberInvoices.findFirst({
                where: eq(memberInvoices.id, transaction.invoiceId),
                columns: { id: true, memberPlanId: true },
            })
            : null;
        if (invoice) {
            // TODO: update the linked invoice after the transaction becomes paid or failed.
            console.log("[AUTHORIZE WEBHOOK] TODO update invoice", invoice.id);
        }

        const metadata = transaction.metadata ?? {};
        const planId = invoice?.memberPlanId;
        const packageId = typeof metadata.packageId === "string"
            ? metadata.packageId
            : planId?.startsWith("pkg_") ? planId : undefined;
        const subscriptionId = typeof metadata.subscriptionId === "string"
            ? metadata.subscriptionId
            : planId && !planId.startsWith("pkg_") ? planId : undefined;

        if (packageId) {
            // TODO: activate or fail the package based on the transaction status.
            console.log("[AUTHORIZE WEBHOOK] TODO update package", packageId);
        }
        if (subscriptionId) {
            // TODO: activate or mark the subscription past due based on the transaction status.
            console.log("[AUTHORIZE WEBHOOK] TODO update subscription", subscriptionId);
        }

        return status(200, { message: "Authorize.net event received" });
    }, { parse: "none" });
    return app;
}
