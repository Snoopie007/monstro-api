import { db } from "@/db/db";
import { memberInvoices, memberSubscriptions } from "@subtrees/schemas";
import type { SubscriptionBillingAttempt } from "@subtrees/types/subscriptionBilling";
import { getStripeMigration } from "@subtrees/utils/subscriptionBilling";
import { and, eq, isNull, sql } from "drizzle-orm";

export type InvoiceAttemptClaim =
    | { ok: true; invoiceId: string; attempt: SubscriptionBillingAttempt; attemptCount: number }
    | { ok: false; reason: "paid" | "succeeded" | "in_flight" | "unknown" | "missing"; attempt?: SubscriptionBillingAttempt };

function readAttempt(metadata: unknown): SubscriptionBillingAttempt | null {
    if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) return null;
    const value = (metadata as Record<string, unknown>).billingAttempt;
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    return value as SubscriptionBillingAttempt;
}

export async function claimInvoiceAttempt(input: {
    invoiceId: string;
    gatewayIntegrationId: string;
    gatewayCustomerId: string;
    paymentMethodId: string;
    paymentType: SubscriptionBillingAttempt["paymentType"];
    stripeAccountId?: string;
}): Promise<InvoiceAttemptClaim> {
    return db.transaction(async (tx) => {
        const [invoice] = await tx.select({
            id: memberInvoices.id,
            paid: memberInvoices.paid,
            status: memberInvoices.status,
            attemptCount: memberInvoices.attemptCount,
            metadata: memberInvoices.metadata,
        }).from(memberInvoices).where(eq(memberInvoices.id, input.invoiceId)).limit(1).for("update");
        if (!invoice) return { ok: false, reason: "missing" };
        if (invoice.paid || invoice.status === "paid") return { ok: false, reason: "paid" };
        const prior = readAttempt(invoice.metadata);
        if (prior?.status === "succeeded") {
            return { ok: false, reason: "succeeded", attempt: prior };
        }
        if (prior && ["in_flight", "processing", "unknown", "requires_action"].includes(prior.status)) {
            return { ok: false, reason: prior.status === "in_flight" ? "in_flight" : "unknown", attempt: prior };
        }
        const attemptCount = prior?.status === "failed"
            ? invoice.attemptCount + 1
            : invoice.attemptCount;
        const attempt: SubscriptionBillingAttempt = {
            id: `billing-${invoice.id}-${attemptCount}`,
            status: "in_flight",
            startedAt: new Date().toISOString(),
            gatewayIntegrationId: input.gatewayIntegrationId,
            gatewayCustomerId: input.gatewayCustomerId,
            paymentMethodId: input.paymentMethodId,
            paymentType: input.paymentType,
            ...(input.stripeAccountId ? { stripeAccountId: input.stripeAccountId } : {}),
        };
        const [claimed] = await tx.update(memberInvoices).set({
            attemptCount,
            metadata: {
                ...((invoice.metadata as Record<string, unknown> | null) ?? {}),
                billingAttempt: attempt,
            },
            updated: new Date(),
        }).where(and(
            eq(memberInvoices.id, invoice.id),
            sql`coalesce(${memberInvoices.metadata}->'billingAttempt'->>'status', '') not in ('in_flight', 'processing', 'unknown', 'requires_action')`,
        )).returning({ id: memberInvoices.id });
        if (!claimed) return { ok: false, reason: "in_flight", attempt: prior ?? undefined };
        return { ok: true, invoiceId: invoice.id, attempt, attemptCount };
    });
}

export async function saveInvoiceAttemptResult(input: {
    invoiceId: string;
    attemptId: string;
    status: SubscriptionBillingAttempt["status"];
    paymentIntentId?: string;
    retryable?: boolean;
}) {
    await db.transaction(async (tx) => {
        const [invoice] = await tx.select({
            metadata: memberInvoices.metadata,
            paid: memberInvoices.paid,
            status: memberInvoices.status,
        }).from(memberInvoices)
            .where(eq(memberInvoices.id, input.invoiceId)).limit(1).for("update");
        if (!invoice) return;
        const metadata = (invoice.metadata as Record<string, unknown> | null) ?? {};
        const prior = readAttempt(metadata);
        if (!prior || prior.id !== input.attemptId) return;
        if ((invoice.paid || invoice.status === "paid" || prior.status === "succeeded")
            && input.status !== "succeeded") return;
        const billingAttempt: SubscriptionBillingAttempt = {
            ...prior,
            status: input.status,
            ...(input.paymentIntentId ? { paymentIntentId: input.paymentIntentId } : {}),
            ...(input.retryable === undefined ? {} : { retryable: input.retryable }),
        };
        await tx.update(memberInvoices).set({
            metadata: { ...metadata, billingAttempt },
            updated: new Date(),
        }).where(eq(memberInvoices.id, input.invoiceId));
    });
}


export async function advanceRenewalCycleAfterMigrationGate(input: {
    subscriptionId: string;
    invoiceId: string;
    attemptKey: string;
    periodStart: Date;
    nextPeriodEnd: Date;
}): Promise<boolean> {
    return db.transaction(async (tx) => {
        const [invoice] = await tx.select({
            metadata: memberInvoices.metadata,
        }).from(memberInvoices).where(eq(memberInvoices.id, input.invoiceId)).for("update");
        if (!invoice) throw new Error(`Invoice ${input.invoiceId} not found`);
        const metadata = (invoice.metadata as Record<string, unknown> | null) ?? {};
        const attempt = readAttempt(metadata);
        if (attempt?.id !== input.attemptKey) return false;

        const cycle = metadata.renewalCycle;
        if (!cycle || typeof cycle !== "object" || Array.isArray(cycle)) return true;
        if (!("state" in cycle) || !("periodStart" in cycle) || !("periodEnd" in cycle)
            || typeof cycle.state !== "string"
            || typeof cycle.periodStart !== "string"
            || typeof cycle.periodEnd !== "string") return false;
        const cycleStart = new Date(cycle.periodStart);
        const cycleEnd = new Date(cycle.periodEnd);
        if (!Number.isFinite(cycleStart.getTime()) || !Number.isFinite(cycleEnd.getTime())
            || cycleStart.getTime() !== input.periodStart.getTime()
            || cycleEnd.getTime() !== input.nextPeriodEnd.getTime()) return false;

        const [subscription] = await tx.select({
            id: memberSubscriptions.id,
            parentId: memberSubscriptions.parentId,
            currentPeriodEnd: memberSubscriptions.currentPeriodEnd,
            metadata: memberSubscriptions.metadata,
        }).from(memberSubscriptions)
            .where(eq(memberSubscriptions.id, input.subscriptionId))
            .for("update");
        if (!subscription || subscription.parentId || !subscription.currentPeriodEnd) return false;
        const migration = getStripeMigration(subscription.metadata);
        if (migration?.state !== "armed" && migration?.state !== "first_payment_verified") return false;

        if (cycle.state === "advanced") {
            if (subscription.currentPeriodEnd.getTime() !== cycleEnd.getTime()) return false;
            if (metadata.migrationGateAttemptId !== input.attemptKey) {
                await tx.update(memberInvoices).set({
                    metadata: { ...metadata, migrationGateAttemptId: input.attemptKey },
                    updated: new Date(),
                }).where(eq(memberInvoices.id, input.invoiceId));
            }
            return true;
        }
        if (cycle.state !== "pending_migration_gate"
            || subscription.currentPeriodEnd.getTime() !== cycleStart.getTime()) return false;

        await tx.update(memberSubscriptions).set({
            currentPeriodStart: cycleStart,
            currentPeriodEnd: cycleEnd,
            updated: new Date(),
        }).where(and(
            eq(memberSubscriptions.id, input.subscriptionId),
            isNull(memberSubscriptions.parentId),
        ));
        await tx.update(memberInvoices).set({
            metadata: {
                ...metadata,
                migrationGateAttemptId: input.attemptKey,
                renewalCycle: { ...cycle, state: "advanced" },
            },
            updated: new Date(),
        }).where(eq(memberInvoices.id, input.invoiceId));
        return true;
    });
}
