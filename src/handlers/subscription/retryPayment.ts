import { paymentFailureFromError, isPaymentDecline } from "@/subtrees/utils/workflowPayments";
import { StripePaymentGateway } from "@/libs/PaymentGateway";
import { db } from "@/db/db";
import { BillingContextError, assertImportedSubscriptionRetrySafe, resolveSubscriptionBillingContext } from "@/routes/x/loc/subscriptions/billingContext";
import {
    claimInvoiceAttempt,
    saveInvoiceAttemptResult,
} from "@/routes/x/loc/subscriptions/invoiceAttempts";
import { getStripeMigration } from "@/subtrees/utils/subscriptionBilling";
import { scheduleRenewalRepair } from "@/queues/subscriptions";
import type { SubscriptionBillingContext } from "@/routes/x/loc/subscriptions/billingContext";
import { chargeWithGateway, stripePaymentIntentFromError, type ChargeWithGatewayResult } from "@/utils/checkoutUtil";
import type { TransactionActivity } from "@/subtrees/types";
import { memberInvoices, memberSubscriptions, transactions } from "@/subtrees/schemas";
import { and, eq, or, sql } from "drizzle-orm";

export type RetryPaymentErrorCode =
    | "SUBSCRIPTION_NOT_FOUND"
    | "SUBSCRIPTION_CHILD"
    | "SUBSCRIPTION_CANCELED"
    | "NO_PAYMENT_METHOD"
    | "INVOICE_NOT_FOUND"
    | "TRANSACTION_NOT_FOUND"
    | "LOCATION_INACTIVE"
    | "PAYMENT_IN_FLIGHT"
    | "PAYMENT_UNKNOWN"
    | "CHARGE_FAILED";

export type RetryPaymentResult =
    | { ok: true; subscriptionId: string; invoiceId: string; transactionId: string }
    | { ok: false; code: RetryPaymentErrorCode; message: string };

function fail(code: RetryPaymentErrorCode, message: string): RetryPaymentResult {
    return { ok: false, code, message };
}
type BillingAttemptSnapshot = {
    id: string;
    status: string;
    paymentIntentId?: string;
};

function readBillingAttempt(metadata: unknown): BillingAttemptSnapshot | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const attempt = (metadata as Record<string, unknown>).billingAttempt;
    if (!attempt || typeof attempt !== "object" || Array.isArray(attempt)) return null;
    const value = attempt as Record<string, unknown>;
    return typeof value.id === "string" && typeof value.status === "string"
        ? {
            id: value.id,
            status: value.status,
            ...(typeof value.paymentIntentId === "string" ? { paymentIntentId: value.paymentIntentId } : {}),
        }
        : null;
}
function classifyPaymentIntentStatus(status: string | undefined): "failed" | "processing" | "requires_action" | "unknown" {
    if (status === "requires_payment_method" || status === "canceled") return "failed";
    if (status === "processing") return "processing";
    if (status === "requires_action") return "requires_action";
    return "unknown";
}

async function recordMigrationGateFailure(input: {
    invoiceId: string;
    attemptId: string;
    subscriptionId: string;
    error: unknown;
}) {
    const gateError = input.error instanceof BillingContextError ? input.error : null;
    await saveInvoiceAttemptResult({
        invoiceId: input.invoiceId,
        attemptId: input.attemptId,
        status: "failed",
        retryable: false,
    });
    if (gateError?.code === "MIGRATION_BLOCKED") {
        const reason = input.error instanceof Error ? input.error.message : "Legacy billing state could not be verified";
        await db.update(memberSubscriptions).set({
            metadata: sql`coalesce(${memberSubscriptions.metadata}, '{}'::jsonb) || jsonb_build_object(
                'stripeMigration',
                coalesce(${memberSubscriptions.metadata}->'stripeMigration', '{}'::jsonb)
                    || jsonb_build_object('state', 'blocked', 'blockedReason', ${reason.slice(0, 500)})
            )`,
            updated: new Date(),
        }).where(and(
            eq(memberSubscriptions.id, input.subscriptionId),
            sql`${memberSubscriptions.metadata}->'stripeMigration'->>'state' = 'armed'`,
        ));
    }
}


export async function retrySubscriptionPayment(props: {
    lid: string;
    memberPlanId: string;
}): Promise<RetryPaymentResult> {
    const { lid, memberPlanId } = props;
    const sub = await db.query.memberSubscriptions.findFirst({
        where: (s, { and, eq: eqCol }) => and(
            eqCol(s.locationId, lid),
            eqCol(s.id, memberPlanId),
        ),
    });
    if (!sub) return fail("SUBSCRIPTION_NOT_FOUND", "Subscription not found");
    if (sub.parentId) return fail("SUBSCRIPTION_CHILD", "Only root subscriptions can be retried.");
    if (sub.cancelAt && sub.cancelAt.getTime() <= Date.now()) {
        return fail("SUBSCRIPTION_CANCELED", "This subscription is canceled and cannot be retried.");
    }
    const importedStripeRoot = Boolean(getStripeMigration(sub.metadata));

    const invoice = await db.query.memberInvoices.findFirst({
        where: (i, { and, eq: eqCol }) => and(
            eqCol(i.memberPlanId, sub.id),
            eqCol(i.locationId, lid),
            eqCol(i.memberId, sub.memberId),
            or(
                eqCol(i.status, "unpaid"),
                eqCol(i.status, "paid"),
                eqCol(i.paid, true),
            ),
            or(
                eqCol(i.forPeriodStart, sub.currentPeriodStart),
                sql`${memberInvoices.metadata}->'renewalCycle'->>'state' in ('pending_migration_gate', 'advanced')`,
            ),
        ),
        with: { transaction: true },
        orderBy: (i, { desc }) => desc(i.forPeriodStart),
    });
    if (!invoice) return fail("INVOICE_NOT_FOUND", "Failed invoice not found");
    const transaction = invoice.transaction;
    if (!transaction) return fail("TRANSACTION_NOT_FOUND", "Transaction not found");
    if (invoice.paid || invoice.status === "paid") {
        if (importedStripeRoot) await scheduleRenewalRepair(sub.id, lid, invoice.forPeriodEnd);
        return {
            ok: true,
            subscriptionId: sub.id,
            invoiceId: invoice.id,
            transactionId: transaction.id,
        };
    }
    const renewalCycle = invoice.metadata?.renewalCycle;
    const renewalCycleState = renewalCycle && typeof renewalCycle === "object" && !Array.isArray(renewalCycle)
        ? (renewalCycle as { state?: unknown }).state
        : null;
    if (renewalCycleState === "pending_migration_gate") {
        return fail("CHARGE_FAILED", "Subscription renewal is held for worker/support migration recovery");
    }
    if ((renewalCycleState === "pending_migration_gate" || renewalCycleState === "advanced")
        && (!invoice.forPeriodStart || !invoice.forPeriodEnd)) {
        return fail("CHARGE_FAILED", "Subscription renewal period metadata is incomplete");
    }
    if (!sub.gatewayPaymentId) return fail("NO_PAYMENT_METHOD", "Subscription has no gateway payment method");

    let billingContext: SubscriptionBillingContext;
    try {
        billingContext = await resolveSubscriptionBillingContext(sub, { requirePaymentMethod: true });
    } catch (error) {
        if (error instanceof BillingContextError) {
            return fail(
                error.code === "PAYMENT_METHOD_MISSING" ? "NO_PAYMENT_METHOD" : "CHARGE_FAILED",
                error.message,
            );
        }
        throw error;
    }
    const paymentMethodId = billingContext.paymentMethodId ?? sub.gatewayPaymentId;
    if (!paymentMethodId) return fail("NO_PAYMENT_METHOD", "Subscription has no gateway payment method");
    const paymentType = billingContext.paymentMethodType ?? transaction.paymentType;
    const previousAttempt = readBillingAttempt(invoice.metadata);
    if (previousAttempt && ["unknown", "processing", "requires_action"].includes(previousAttempt.status)) {
        if (!previousAttempt.paymentIntentId || billingContext.gateway.service !== "stripe") {
            return fail("PAYMENT_UNKNOWN", "Payment outcome is unknown; retrieve it before retrying");
        }
        let paymentIntent;
        try {
            paymentIntent = await new StripePaymentGateway(billingContext.gateway.accessToken)
                .retrievePaymentIntent(previousAttempt.paymentIntentId);
        } catch {
            return fail("PAYMENT_UNKNOWN", "Payment outcome is unknown; retrieve it before retrying");
        }
        if (paymentIntent.status === "succeeded") {
            if (paymentIntent.amount !== invoice.total) {
                return fail("PAYMENT_UNKNOWN", "Retrieved payment amount does not match the invoice");
            }
            await saveInvoiceAttemptResult({
                invoiceId: invoice.id,
                attemptId: previousAttempt.id,
                status: "succeeded",
                paymentIntentId: paymentIntent.id,
            });
            await db.transaction(async (tx) => {
                await tx.update(transactions).set({
                    status: "paid",
                    paymentMethodId,
                    paymentType,
                    paymentIntentId: paymentIntent.id,
                    updated: new Date(),
                }).where(eq(transactions.id, transaction.id));
                await tx.update(memberInvoices).set({
                    status: "paid",
                    paid: true,
                    paymentType,
                    updated: new Date(),
                }).where(eq(memberInvoices.id, invoice.id));
                await tx.update(memberSubscriptions).set({
                    status: "active",
                    metadata: sql`jsonb_set(coalesce(${memberSubscriptions.metadata}, '{}'::jsonb), '{stripeMigration,state}', '"first_payment_verified"'::jsonb, true)`,
                }).where(and(
                    eq(memberSubscriptions.id, sub.id),
                    sql`${memberSubscriptions.status} not in ('paused', 'canceled')`,
                    sql`${memberSubscriptions.metadata}->'stripeMigration'->>'state' = 'armed'`,
                ));
                await tx.update(memberSubscriptions).set({
                    status: "active",
                }).where(and(
                    eq(memberSubscriptions.id, sub.id),
                    sql`${memberSubscriptions.status} not in ('paused', 'canceled')`,
                    sql`coalesce(${memberSubscriptions.metadata}->'stripeMigration'->>'state', '') <> 'armed'`,
                ));
            });
            if (importedStripeRoot && billingContext.gateway.service === "stripe") {
                await scheduleRenewalRepair(sub.id, lid, invoice.forPeriodEnd);
            }
            return {
                ok: true,
                subscriptionId: sub.id,
                invoiceId: invoice.id,
                transactionId: transaction.id,
            };
        }
        if (["requires_payment_method", "canceled"].includes(paymentIntent.status)) {
            await saveInvoiceAttemptResult({
                invoiceId: invoice.id,
                attemptId: previousAttempt.id,
                status: "failed",
                paymentIntentId: paymentIntent.id,
                retryable: true,
            });
        } else {
            return fail("PAYMENT_UNKNOWN", "Payment is still processing; retry will not create another charge");
        }
    }

    const claim = await claimInvoiceAttempt({
        invoiceId: invoice.id,
        gatewayIntegrationId: billingContext.gateway.id,
        gatewayCustomerId: billingContext.gatewayCustomerId,
        paymentMethodId,
        paymentType,
        stripeAccountId: billingContext.gateway.accountId,
    });
    if (!claim.ok) {
        if (claim.reason === "paid") return fail("CHARGE_FAILED", "Invoice is already paid");
        if (claim.reason === "succeeded") return fail("PAYMENT_UNKNOWN", "A prior payment succeeded; reconcile the invoice before retrying");
        if (claim.reason === "in_flight") return fail("PAYMENT_IN_FLIGHT", "Payment attempt is still in flight");
        if (claim.reason === "unknown") return fail("PAYMENT_UNKNOWN", "Payment outcome is unknown; retrieve it before retrying");
        return fail("INVOICE_NOT_FOUND", "Invoice not found");
    }
    const attemptId = claim.attempt.id;
    try {
        await assertImportedSubscriptionRetrySafe(sub, billingContext.gateway, invoice.forPeriodStart);
    } catch (error) {
        await recordMigrationGateFailure({
            invoiceId: invoice.id,
            attemptId,
            subscriptionId: sub.id,
            error,
        });
        return fail(
            "CHARGE_FAILED",
            error instanceof Error ? error.message : "Subscription retry is blocked by migration safety checks",
        );
    }

    let charge: ChargeWithGatewayResult;
    try {
        charge = await chargeWithGateway({
            gateway: billingContext.gateway as Parameters<typeof chargeWithGateway>[0]["gateway"],
            gatewayCustomerId: billingContext.gatewayCustomerId,
            paymentMethodId,
            transactionId: attemptId,
            total: invoice.total,
            feesAmount: transaction.feeAmount,
            currency: transaction.currency,
            description: `Retry payment for ${invoice.id}`,
            note: `transId:${transaction.id}|mid:${sub.memberId}|lid:${lid}|priceId:${sub.id}`,
            metadata: {
                locationId: lid,
                memberId: sub.memberId,
                invoiceId: invoice.id,
                memberPlanId: sub.id,
                billingAttemptId: attemptId,
            },
            paymentType,
        });
    } catch (error) {
        const paymentIntent = stripePaymentIntentFromError(error);
        const attemptStatus = classifyPaymentIntentStatus(paymentIntent?.status);
        await saveInvoiceAttemptResult({
            invoiceId: invoice.id,
            attemptId,
            status: attemptStatus,
            paymentIntentId: paymentIntent?.id,
            retryable: attemptStatus === "failed",
            workflowDecline: !!paymentFailureFromError(error),
        });
        return fail(
            attemptStatus === "failed" ? "CHARGE_FAILED" : "PAYMENT_UNKNOWN",
            error instanceof Error ? error.message : "Payment outcome is unknown",
        );

    }
    const now = new Date();
    const activity: TransactionActivity = charge.status === "approved"
        ? {
            at: now.toISOString(),
            reason: `Payment ${charge.status}`,
            paymentType: charge.paymentType ?? paymentType,
            brand: charge.brand,
            last4: charge.last4,
        }
        : {
            at: now.toISOString(),
            reason: charge.status === "failed" ? `Payment failed: ${charge.failureReason}` : `Payment outcome: ${charge.message}`,
            paymentType: charge.paymentType ?? paymentType,
            brand: charge.brand,
            last4: charge.last4,
        };
    const attemptStatus = charge.status === "approved"
        ? "succeeded"
        : charge.status === "failed"
            ? "failed"
            : classifyPaymentIntentStatus(charge.paymentIntentStatus);
    await saveInvoiceAttemptResult({
        invoiceId: invoice.id,
        attemptId,
        status: attemptStatus,
        paymentIntentId: "paymentIntentId" in charge ? charge.paymentIntentId : undefined,
        retryable: attemptStatus === "failed",
        workflowDecline: charge.status === "failed" && isPaymentDecline(billingContext.gateway.service, charge.failureCode, charge.gatewayMetadata.squarePaymentStatus, charge.gatewayMetadata.authorizeResponseCode),
    });
    const migration = sub.metadata?.stripeMigration;
    const importedMigrationArmed = migration
        && typeof migration === "object"
        && !Array.isArray(migration)
        && (migration as { state?: unknown }).state === "armed";
    await db.transaction(async (tx) => {
        await tx.update(transactions).set({
            ...(charge.status === "approved" ? { status: "paid" as const } : attemptStatus === "failed" ? { status: "failed" as const } : {}),
            paymentMethodId,
            paymentType: charge.paymentType ?? paymentType,
            ...("paymentIntentId" in charge && charge.paymentIntentId ? { paymentIntentId: charge.paymentIntentId } : {}),
            activities: [...(transaction.activities ?? []), activity],
            metadata: { ...transaction.metadata, ...charge.gatewayMetadata },
            updated: now,
        }).where(eq(transactions.id, transaction.id));
        if (charge.status === "approved") {
            await tx.update(memberInvoices).set({
                status: "paid",
                paid: true,
                paymentType: charge.paymentType ?? paymentType,
            }).where(eq(memberInvoices.id, invoice.id));
            if (importedMigrationArmed) {
                await tx.update(memberSubscriptions).set({
                    status: "active",
                    metadata: sql`jsonb_set(coalesce(${memberSubscriptions.metadata}, '{}'::jsonb), '{stripeMigration,state}', '"first_payment_verified"'::jsonb, true)`,
                }).where(and(
                    eq(memberSubscriptions.id, sub.id),
                    sql`${memberSubscriptions.status} not in ('paused', 'canceled')`,
                    sql`${memberSubscriptions.metadata}->'stripeMigration'->>'state' = 'armed'`,
                ));
            } else {
                await tx.update(memberSubscriptions).set({
                    status: "active",
                }).where(and(
                    eq(memberSubscriptions.id, sub.id),
                    sql`${memberSubscriptions.status} not in ('paused', 'canceled')`,
                ));
            }
        }
    });

    if (attemptStatus === "succeeded" && importedStripeRoot && billingContext.gateway.service === "stripe") {
        await scheduleRenewalRepair(sub.id, lid, invoice.forPeriodEnd);
    }
    if (attemptStatus !== "succeeded") {
        const message = charge.status === "failed"
            ? charge.failureReason
            : charge.status === "uncertain"
                ? charge.message
                : "Payment outcome is unknown";
        return fail(
            attemptStatus === "failed" ? "CHARGE_FAILED" : "PAYMENT_UNKNOWN",
            message,
        );
    }
    return {
        ok: true,
        subscriptionId: sub.id,
        invoiceId: invoice.id,
        transactionId: transaction.id,
    };
}
