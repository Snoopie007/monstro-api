import { db } from "@/db/db";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { memberInvoices, memberSubscriptions, transactions } from "@subtrees/schemas";
import {
    calcTotals,
    createInvoiceBody,
    PENDING_TRANSACTION_PAYMENT_TYPE,
    PENDING_TRANSACTION_STATUS,
} from "./shared";

export async function createInvoiceRoutes(app: Elysia) {
    return app.post("/", async ({ body, params, status }) => {
        const { lid } = params as { lid: string };
        const payload = Array.isArray(body) ? body[0] : body;
        if (!payload) {
            console.error("[x/invoices:create] Invalid payload", { locationId: lid, body });
            return status(400, { error: "Invalid request body" });
        }
        const {
            memberId,
            type,
            collectionMethod,
            paymentType,
            subscriptionId,
            selectedSubscriptionId,
            items,
            dueDate,
            description,
            tax = 0,
            discount = 0,
        } = payload;

        const member = await db.query.members.findFirst({
            where: (m, { eq }) => eq(m.id, memberId),
        });

        if (!member) {
            console.error("[x/invoices:create] Member not found", {
                locationId: lid,
                memberId,
            });
            return status(404, { error: "Member not found" });
        }

        if (type === "from-subscription") {
            const sid = selectedSubscriptionId || subscriptionId;
            if (!sid) {
                return status(400, { error: "subscriptionId is required for from-subscription" });
            }

            const sub = await db.query.memberSubscriptions.findFirst({
                where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid), eq(s.memberId, memberId)),
                with: {
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                },
            });

            if (!sub || !sub.pricing) {
                return status(404, { error: "Subscription not found" });
            }

            const lineItems = [{
                name: `${sub.pricing.plan?.name || "Plan"}${sub.pricing.name ? ` - ${sub.pricing.name}` : ""}`,
                description: sub.pricing.plan?.description || "",
                quantity: 1,
                price: sub.pricing.price,
            }];

            const { subtotal, total } = calcTotals(lineItems, tax, discount);

            const [invoice] = await db.insert(memberInvoices).values({
                memberId,
                locationId: lid,
                memberSubscriptionId: sub.id,
                description: description || `${sub.pricing.plan?.name || "Subscription"} billing period`,
                items: lineItems,
                subTotal: subtotal,
                total,
                tax,
                discount,
                currency: sub.pricing.currency || sub.pricing.plan?.currency || "usd",
                status: "draft",
                dueDate: dueDate ? new Date(dueDate) : new Date(sub.currentPeriodEnd),
                paymentType: sub.paymentType,
                invoiceType: "recurring",
                forPeriodStart: new Date(sub.currentPeriodStart),
                forPeriodEnd: new Date(sub.currentPeriodEnd),
                metadata: {
                    type: "from-subscription",
                    subscriptionId: sub.id,
                    collectionMethod,
                },
            }).returning();

            if (!invoice) {
                console.error("[x/invoices:create] Subscription invoice insert failed", {
                    locationId: lid,
                    memberId,
                    subscriptionId: sub.id,
                });
                return status(500, { error: "Failed to create invoice" });
            }

            await db.insert(transactions).values({
                memberId,
                locationId: lid,
                invoiceId: invoice.id,
                description: description || `${sub.pricing.plan?.name || "Subscription"} payment`,
                type: "inbound",
                status: PENDING_TRANSACTION_STATUS,
                paymentType: PENDING_TRANSACTION_PAYMENT_TYPE,
                total,
                subTotal: subtotal,
                tax,
                currency: sub.pricing.currency || "usd",
                metadata: {
                    intendedPaymentType: sub.paymentType,
                    collectionMethod,
                },
                items: lineItems.map((item) => ({
                    name: item.name,
                    amount: item.price,
                    quantity: item.quantity,
                    tax: 0,
                })),
            });

            return status(201, { invoice });
        }

        if (!items || items.length === 0) {
            return status(400, { error: "items are required" });
        }

        const invoiceItems = items.map((item) => ({
            name: item.name,
            description: item.description || "",
            quantity: Number(item.quantity || 1),
            price: Number(item.price || 0),
        }));

        const { subtotal, total } = calcTotals(invoiceItems, tax, discount);
        let invoice: typeof memberInvoices.$inferSelect | undefined;
        try {
            const [createdInvoice] = await db.insert(memberInvoices).values({
                memberId,
                locationId: lid,
                memberSubscriptionId: subscriptionId || null,
                description: description || `Invoice for ${member.firstName} ${member.lastName}`,
                items: invoiceItems,
                subTotal: subtotal,
                total,
                tax,
                discount,
                currency: "usd",
                status: "draft",
                dueDate: dueDate ? new Date(dueDate) : new Date(),
                paymentType,
                invoiceType: type === "recurring" ? "recurring" : "one-off",
                metadata: {
                    type,
                    collectionMethod,
                },
            }).returning();
            invoice = createdInvoice;
        } catch (error) {
            console.error("[x/invoices:create] One-off invoice insert threw", {
                locationId: lid,
                memberId,
                type,
                paymentType,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                error,
            });
            throw error;
        }

        if (!invoice) {
            console.error("[x/invoices:create] One-off invoice insert failed", {
                locationId: lid,
                memberId,
                type,
            });
            return status(500, { error: "Failed to create invoice" });
        }

        try {
            await db.insert(transactions).values({
                memberId,
                locationId: lid,
                invoiceId: invoice.id,
                description: description || `Invoice payment`,
                type: "inbound",
                status: PENDING_TRANSACTION_STATUS,
                paymentType: PENDING_TRANSACTION_PAYMENT_TYPE,
                total,
                subTotal: subtotal,
                tax,
                currency: "usd",
                metadata: {
                    intendedPaymentType: paymentType,
                    collectionMethod,
                },
                items: invoiceItems.map((item) => ({
                    name: item.name,
                    amount: item.price,
                    quantity: item.quantity,
                    tax: 0,
                })),
            });
        } catch (error) {
            console.error("[x/invoices:create] Transaction insert threw", {
                locationId: lid,
                memberId,
                invoiceId: invoice.id,
                paymentType,
                message: error instanceof Error ? error.message : String(error),
                stack: error instanceof Error ? error.stack : undefined,
                error,
            });
            throw error;
        }

        return status(201, { invoice });
    }, {
        body: t.Union([
            createInvoiceBody,
            t.Array(createInvoiceBody),
        ]),
    });
}
