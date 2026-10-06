import { getDeferredBilling, isDeferredFirstPeriod } from "@/subtrees/utils/deferredBilling";
import { getNextCashCycle } from "@/subtrees/utils/cashBilling";
import { strict as assert } from "node:assert";
import { db } from "@/db/db";
import type Elysia from "elysia";
import { t } from "elysia";
import { and, eq } from "drizzle-orm";
import { memberInvoices, memberSubscriptions, transactions } from "@/subtrees/schemas";
import {
    calcTotals,
    createInvoiceBody,
    PENDING_TRANSACTION_PAYMENT_TYPE,
    PENDING_TRANSACTION_STATUS,
} from "./shared";
import { buildSubscriptionInvoiceQuote } from "./subscriptionQuote";
import { CashInvoiceError, ensureCashInvoice } from "@/subtrees/utils/server/cashInvoices";
import { canEditLocationMember } from "@/utils/locationAccess";

export async function createInvoiceRoutes(app: Elysia) {
    return app.post("/", async ctx => {
        const { body, params, status } = ctx;
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
            paymentMethodId,
            subscriptionId,
            selectedSubscriptionId,
            periodStart,
            periodEnd,
            items,
            dueDate,
            description,
            tax = 0,
            discount = 0,
            recurringSettings,
            gatewayService,
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
        if (type === "one-off" && subscriptionId && collectionMethod === "charge_automatically") {
            return status(400, {
                error: "Subscription-linked automatic invoices must use the subscription payment retry flow",
                code: "SUBSCRIPTION_RETRY_REQUIRED",
            });
        }

        if (type === "from-subscription") {
            // Subscription-generated invoices should use the subscription's own billing state.
            const sid = selectedSubscriptionId || subscriptionId;
            if (!sid) {
                return status(400, { error: "subscriptionId is required for from-subscription" });
            }

            const sub = await db.query.memberSubscriptions.findFirst({
                where: (s, { and, eq }) => and(eq(s.id, sid), eq(s.locationId, lid), eq(s.memberId, memberId)),
                with: {
                    location: {
                        with: {
                            locationState: true,
                            taxRates: true,
                        },
                    },
                    pricing: {
                        with: {
                            plan: true,
                        },
                    },
                },
            });

            if (!sub) {
                return status(404, { error: "Subscription billing definition not found" });
            }
            if (sub.parentId) {
                return status(400, { error: "Only root subscriptions can generate recurring invoices", code: "SUBSCRIPTION_CHILD" });
            }
            if (!sub.pricing) {
                return status(404, { error: "Subscription billing definition not found" });
            }
            if (collectionMethod === "charge_automatically") {
                return status(400, {
                    error: "Subscription-linked automatic invoices must use the subscription payment retry flow",
                    code: "SUBSCRIPTION_RETRY_REQUIRED",
                });
            }

            if (sub.paymentType === "cash") {
                const actor = ctx as typeof ctx & { vendorId?: string; staffId?: string; userId?: string };
                if (!await canEditLocationMember(lid, actor)) return status(403, { error: "Forbidden", code: "FORBIDDEN" });
                const now = new Date();
                if (!["active", "past_due", "unpaid", "trialing"].includes(sub.status) || sub.startDate > now
                    || (sub.trialEnd && sub.trialEnd > now) || (sub.cancelAt && sub.cancelAt <= now)) {
                    return status(400, { error: "This subscription is not available for cash collection", code: "SUBSCRIPTION_NOT_COLLECTING" });
                }
                const renewal = sub.currentPeriodEnd <= now ? getNextCashCycle(sub, sub.location!.timezone) : null;
                const start = new Date(periodStart ?? renewal?.periodStart ?? sub.currentPeriodStart);
                const end = new Date(periodEnd ?? renewal?.periodEnd ?? sub.currentPeriodEnd);
                if (!Number.isFinite(start.getTime()) || !Number.isFinite(end.getTime())) return status(400, { error: "Invalid billing period" });
                const quote = await buildSubscriptionInvoiceQuote({
                    locationId: lid, subscriptionId: sub.id, parentId: sub.parentId,
                    subscriptionMetadata: sub.metadata, pricing: sub.pricing, periodStart: start,
                    memberPlanPricingId: sub.memberPlanPricingId, promoId: sub.promoId, location: sub.location,
                    billingPhase: start.getTime() === sub.currentPeriodEnd.getTime() && sub.status !== "trialing" && !isDeferredFirstPeriod(getDeferredBilling(sub.metadata), start) ? "renewal" : undefined,
                });
                try {
                    const result = await db.transaction(tx => ensureCashInvoice(tx, {
                        subscriptionId: sub.id, memberId, locationId: lid, periodStart: start, periodEnd: end, quote,
                    }));
                    return status(result.created ? 201 : 200, result);
                } catch (error) {
                    if (error instanceof CashInvoiceError) return status(409, { error: error.message, code: error.code });
                    throw error;
                }
            }

            if (getDeferredBilling(sub.metadata)) return status(400, { error: "This subscription collects through its scheduled payment. Use Retry payment for an unpaid invoice." });

            const quote = await buildSubscriptionInvoiceQuote({
                locationId: lid,
                subscriptionId: sub.id,
                parentId: sub.parentId,
                subscriptionMetadata: sub.metadata,
                pricing: sub.pricing,
                memberPlanPricingId: sub.memberPlanPricingId,
                promoId: sub.promoId,
                location: sub.location,
                discount,
            });
            const commissionBilling = sub.metadata?.commissionBilling as Record<string, unknown> | undefined;
            const [invoice] = await db.insert(memberInvoices).values({
                memberId,
                locationId: lid,
                memberPlanId: sub.id,
                description: description || quote.invoiceDescription,
                items: quote.items,
                subTotal: quote.subTotal,
                total: quote.total,
                tax: quote.tax,
                currency: quote.currency,
                status: "draft",
                dueDate: dueDate ? new Date(dueDate) : new Date(sub.currentPeriodEnd),
                paymentType: sub.paymentType,
                invoiceType: "recurring",
                forPeriodStart: new Date(sub.currentPeriodStart),
                forPeriodEnd: new Date(sub.currentPeriodEnd),
                metadata: {
                    type: "from-subscription",
                    commissionAllowanceInterval: commissionBilling?.allowanceInterval,
                    commissionBillingInterval: commissionBilling?.billingInterval,
                    commissionBillingThreshold: commissionBilling?.billingThreshold,
                    commissionVisitAllowance: commissionBilling?.visitAllowance,
                    subscriptionId: sub.id,
                    collectionMethod,
                    platformFeeAmount: quote.platformFeeAmount,
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

            return status(201, { invoice });
        }

        if (type === "recurring" && subscriptionId) {
            const recurringSubscription = await db.query.memberSubscriptions.findFirst({
                where: (subscription, { and, eq }) => and(
                    eq(subscription.id, subscriptionId),
                    eq(subscription.locationId, lid),
                    eq(subscription.memberId, memberId),
                ),
                columns: { parentId: true },
            });
            if (!recurringSubscription) {
                return status(404, { error: "Subscription not found" });
            }
            if (recurringSubscription.parentId) {
                return status(400, {
                    error: "Only root subscriptions can generate recurring invoices",
                    code: "SUBSCRIPTION_CHILD",
                });
            }
            if (collectionMethod === "charge_automatically") {
                return status(400, {
                    error: "Subscription-linked automatic invoices must use the subscription payment retry flow",
                    code: "SUBSCRIPTION_RETRY_REQUIRED",
                });
            }
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
                memberPlanId: subscriptionId || null,
                description: description || `Invoice for ${member.firstName} ${member.lastName}`,
                items: invoiceItems,
                subTotal: subtotal,
                total,
                tax,
                currency: "USD",
                status: "draft",
                dueDate: dueDate ? new Date(dueDate) : new Date(),
                paymentType,
                invoiceType: type === "recurring" ? "recurring" : "one-off",
                metadata: {
                    type,
                    collectionMethod,
                    ...(type === "recurring" && recurringSettings ? { recurringSettings } : {}),
                    ...(paymentMethodId ? { paymentMethodId } : {}),
                    ...(gatewayService ? { gatewayService } : {}),
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

        const intendedPaymentType = paymentType || "card";
        if (intendedPaymentType === "cash") {
            try {
                const [transaction] = await db.insert(transactions).values({
                    memberId,
                    locationId: lid,
                    description: description || `Invoice payment`,
                    type: "inbound",
                    status: PENDING_TRANSACTION_STATUS,
                    paymentType: PENDING_TRANSACTION_PAYMENT_TYPE,
                    total,
                    subTotal: subtotal,
                    tax,
                    currency: "USD",
                    metadata: {
                        intendedPaymentType,
                        collectionMethod,
                    },
                }).returning({ id: transactions.id });
                assert(transaction);
                await db.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoice.id));
                invoice.transactionId = transaction.id;
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
        }

        return status(201, { invoice });
    }, {
        body: t.Union([
            createInvoiceBody,
            t.Array(createInvoiceBody),
        ]),
    });
}
