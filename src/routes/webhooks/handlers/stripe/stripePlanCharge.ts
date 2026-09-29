import { strict as assert } from "node:assert";

import type { PaymentType } from "@/subtrees/types";
import type { Currency } from "@/subtrees/types/currency";
import { db } from "@/db/db";
import { integrations, locationState, memberInvoices, memberPackages, memberSubscriptions, transactions } from "@/subtrees/schemas";
import { and, eq, sql } from "drizzle-orm";
import Stripe from "stripe";
import { dispatchPaymentFailed } from "@/subtrees/utils/server/workflows";
import { isPaymentDecline } from "@/subtrees/utils/workflowPayments";


interface HandleStripePlanChargeProps {
    invoiceId: string;
    memberPlanId: string;
    locationId: string;
    memberId: string;
    paymentType: PaymentType;
    failedReason: string | null;
    failedCode: string | null;
    success: boolean;
    receiptUrl: string | null;
    amount: number;
    paymentMethodId: string | null;
    paymentIntentId: string | null;
    feeAmount: number;
    stripeAccountId?: string | null;
    stripeChargeId?: string;
    billingAttemptId?: string | null;
    currency?: string;
}



export async function handleStripePlanCharge({
    invoiceId,
    memberPlanId,
    locationId,
    memberId,
    amount,
    paymentType,
    failedReason,
    failedCode,
    success,
    receiptUrl,
    paymentMethodId,
    paymentIntentId,
    feeAmount,
    stripeAccountId,
    stripeChargeId,
    billingAttemptId,
    currency,
}: HandleStripePlanChargeProps) {
    const now = new Date();
    if (success && !stripeAccountId) throw new Error("Stripe webhook is missing connected account binding");
    let authoritative: Stripe.PaymentIntent | undefined;
    let reconciledAttemptId: string | undefined;
    if (success && paymentIntentId && stripeAccountId) {
        const snapshot = await db.query.memberInvoices.findFirst({
            where: eq(memberInvoices.id, invoiceId),
            columns: { metadata: true },
        });
        const value = snapshot?.metadata?.billingAttempt;
        if (value && typeof value === "object" && !Array.isArray(value)) {
            const attempt = value as Record<string, unknown>;
            if (typeof attempt.id === "string" && attempt.id !== billingAttemptId
                && attempt.paymentIntentId === paymentIntentId
                && attempt.stripeAccountId === stripeAccountId
                && typeof attempt.gatewayIntegrationId === "string") {
                const integration = await db.query.integrations.findFirst({
                    where: and(eq(integrations.id, attempt.gatewayIntegrationId), eq(integrations.accountId, stripeAccountId)),
                    columns: { accessToken: true },
                });
                if (!integration?.accessToken) return;
                try {
                    authoritative = await new Stripe(integration.accessToken).paymentIntents.retrieve(
                        paymentIntentId, {}, { stripeAccount: stripeAccountId },
                    );
                    reconciledAttemptId = attempt.id;
                } catch {
                    return;
                }
            }
        }
    }

    await db.transaction(async (tx) => {
        const [current] = await tx.select({
            paid: memberInvoices.paid,
            status: memberInvoices.status,
            transactionId: memberInvoices.transactionId,
            metadata: memberInvoices.metadata,
            total: memberInvoices.total,
            currency: memberInvoices.currency,
            locationId: memberInvoices.locationId,
            memberId: memberInvoices.memberId,
            memberPlanId: memberInvoices.memberPlanId,
            forPeriodEnd: memberInvoices.forPeriodEnd,
        }).from(memberInvoices).where(eq(memberInvoices.id, invoiceId)).limit(1).for("update");
        assert(current, "Invoice not found");
        if (current.locationId !== locationId || current.memberId !== memberId || current.memberPlanId !== memberPlanId) {
            throw new Error("Stripe webhook invoice binding mismatch");
        }
        if (success && amount !== current.total) {
            throw new Error("Stripe webhook invoice amount mismatch");
        }
        if (success && currency && currency.toLowerCase() !== current.currency.toLowerCase()) {
            throw new Error("Stripe webhook invoice currency mismatch");
        }
        const value = current.metadata?.billingAttempt;
        const attempt = value && typeof value === "object" && !Array.isArray(value)
            ? value as Record<string, unknown>
            : null;
        const currentAttemptId = typeof attempt?.id === "string" ? attempt.id : null;
        const currentAttemptPaymentIntentId = typeof attempt?.paymentIntentId === "string" ? attempt.paymentIntentId : null;
        const persistedPaymentIntentId = typeof current.metadata?.paymentIntentId === "string"
            ? current.metadata.paymentIntentId
            : null;
        if (attempt?.status === "succeeded" && !success) return;
        if (currentAttemptId && (
            attempt?.stripeAccountId !== stripeAccountId
            || attempt?.paymentMethodId !== paymentMethodId
        )) return;

        if (stripeAccountId) {
            let integrationId = typeof attempt?.gatewayIntegrationId === "string" ? attempt.gatewayIntegrationId : null;
            if (!integrationId && !memberPlanId.startsWith("pkg_")) {
                const subscription = await tx.query.memberSubscriptions.findFirst({
                    where: eq(memberSubscriptions.id, memberPlanId),
                    columns: { metadata: true },
                });
                if (typeof subscription?.metadata?.gatewayIntegrationId === "string") {
                    integrationId = subscription.metadata.gatewayIntegrationId;
                }
            }
            if (!integrationId) {
                const state = await tx.query.locationState.findFirst({
                    where: eq(locationState.locationId, locationId),
                    columns: { paymentGatewayId: true },
                });
                integrationId = state?.paymentGatewayId ?? null;
            }
            const integration = integrationId
                ? await tx.query.integrations.findFirst({
                    where: eq(integrations.id, integrationId),
                    columns: { accountId: true },
                })
                : null;
            if (integration?.accountId !== stripeAccountId) {
                throw new Error("Stripe webhook account binding mismatch");
            }
        }
        if (currentAttemptId && currentAttemptId !== billingAttemptId) {
            const customerId = typeof authoritative?.customer === "string" ? authoritative.customer : authoritative?.customer?.id;
            const methodId = typeof authoritative?.payment_method === "string" ? authoritative.payment_method : authoritative?.payment_method?.id;
            if (!success || !authoritative || reconciledAttemptId !== currentAttemptId
                || authoritative.id !== currentAttemptPaymentIntentId
                || authoritative.status !== "succeeded"
                || authoritative.amount !== current.total
                || authoritative.currency.toLowerCase() !== current.currency.toLowerCase()
                || customerId !== attempt?.gatewayCustomerId
                || methodId !== attempt?.paymentMethodId) return;
        }
        const expectedPaymentIntentId = currentAttemptPaymentIntentId ?? persistedPaymentIntentId;
        if (paymentIntentId && expectedPaymentIntentId && expectedPaymentIntentId !== paymentIntentId) return;
        if (current.paid || current.status === "paid") return;
        const [invoice] = await tx.update(memberInvoices).set({
            status: success ? "paid" : "unpaid",
            paid: success,
            receiptUrl,
            paymentType,
            metadata: {
                ...(current.metadata || {}),
                ...(paymentIntentId ? { paymentIntentId } : {}),
                ...(attempt ? {
                    billingAttempt: {
                        ...attempt,
                        status: success ? "succeeded" : "failed",
                        paymentType,
                        ...(paymentIntentId ? { paymentIntentId } : {}),
                    }
                } : {}),
            },
            updated: now,
        }).where(eq(memberInvoices.id, invoiceId)).returning();
        assert(invoice, "Invoice not found");

        const values = {
            description: invoice.description,
            currency: (invoice.currency || "USD") as Currency,
            total: invoice.total,
            subTotal: invoice.subTotal,
            tax: invoice.tax,
            items: invoice.items || [],
            type: "inbound" as const,
            status: success ? "paid" as const : "failed" as const,
            failedReason,
            failedCode,
            locationId,
            memberId,
            paymentMethodId,
            paymentIntentId,
            paymentType,
            chargeDate: now,
            feeAmount,
            metadata: {
                gatewayService: "stripe" as const,
                stripeChargeId,
                paymentIntentId,
                memberPlanId,
            },
            updated: now,
        };

        if (invoice.transactionId) {
            const previous = await tx.query.transactions.findFirst({
                where: eq(transactions.id, invoice.transactionId),
                columns: { status: true, failedReason: true, failedCode: true, paymentIntentId: true },
            });
            // A previous decline does not cover a different payment. Require both
            // IDs so missing provider data does not change the existing policy.
            const differentFailedPayment = previous?.status === "failed"
                && !!previous.paymentIntentId && !!paymentIntentId
                && previous.paymentIntentId !== paymentIntentId;
            await tx.update(transactions).set(values).where(eq(transactions.id, invoice.transactionId));
            // Skip a failure already recorded by the charge operation. Unpaid placeholders still count.
            if (!success && isPaymentDecline("stripe", failedCode)
                && (previous?.status === "pending"
                    || (previous?.status === "failed" && !previous.failedCode && !previous.failedReason)
                    || differentFailedPayment)) {
                await dispatchPaymentFailed(tx, invoice.transactionId);
            }
        } else {
            const [transaction] = await tx.insert(transactions).values(values).returning({ id: transactions.id });
            assert(transaction);
            await tx.update(memberInvoices).set({ transactionId: transaction.id }).where(eq(memberInvoices.id, invoiceId));
            if (!success && isPaymentDecline("stripe", failedCode)) await dispatchPaymentFailed(tx, transaction.id);
        }

        if (memberPlanId.startsWith("pkg_")) {
            if (success) {
                await tx.update(memberPackages).set({ status: "active" }).where(eq(memberPackages.id, memberPlanId));
            }
            return;
        }

        await tx.update(memberSubscriptions).set({
            ...(success ? {
                metadata: sql`case when ${memberSubscriptions.metadata}->'stripeMigration'->>'state' = 'armed'
                    then jsonb_set(${memberSubscriptions.metadata}, '{stripeMigration,state}', '"first_payment_verified"'::jsonb)
                    else ${memberSubscriptions.metadata} end`,
            } : {}),
            status: sql`case when ${memberSubscriptions.status} in ('paused', 'canceled')
                then ${memberSubscriptions.status} else ${success ? "active" : "past_due"} end`,
        }).where(and(
            eq(memberSubscriptions.id, memberPlanId),
            sql`${memberSubscriptions.parentId} is null`,
        ));
    });
}
