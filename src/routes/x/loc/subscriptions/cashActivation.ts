import type { DbReader, DbTransaction } from "@/db/db";
import { WorkflowEvents } from "@/subtrees/constants/workflow";
import { memberLocations, memberSubscriptions, promos } from "@/subtrees/schemas";
import { ensureCashInvoice, type CashInvoiceQuote } from "@/subtrees/utils/server/cashInvoices";
import { dispatchWorkflowTrigger } from "@/subtrees/utils/server/workflows";
import { isFuture } from "date-fns";
import { and, eq, sql, type SQL } from "drizzle-orm";
import { buildSubscriptionInvoiceQuote } from "../invoices/subscriptionQuote";
import { promoCheckoutDiscount, readPromo } from "./activation";


export function findCashSubscriptions(database: DbReader, where: SQL | undefined) {
    return database.query.memberSubscriptions.findMany({
        where,
        with: {
            member: {
                columns: {
                    firstName: true,
                    lastName: true,
                    email: true,
                },
            },
            pricing: { with: { plan: true } },
            location: {
                with: {
                    taxRates: true,
                    locationState: true,
                },
                columns: {
                    country: true,
                    name: true,
                    email: true,
                    phone: true,
                    address: true,
                    vendorId: true,
                },
            },
        },
    });
}

type CashSubscription = Awaited<ReturnType<typeof findCashSubscriptions>>[number];

export type BillableCashSubscription = CashSubscription & {
    member: NonNullable<CashSubscription["member"]>;
    location: NonNullable<CashSubscription["location"]>;
    pricing: NonNullable<CashSubscription["pricing"]>;
};

export function hasCashBillingDefinition(sub: CashSubscription): sub is BillableCashSubscription {
    return !!sub.member && !!sub.location && !!sub.pricing;
}

export type CashActivation =
    | { status: "trialing" }
    | { status: "active"; quote: CashInvoiceQuote };

/** Quotes a cash subscription's first invoice. Runs before the activation
 * transaction because the quote reads add-on and fee state outside it. */
export async function planCashActivation(sub: BillableCashSubscription, locationId: string): Promise<CashActivation> {
    if (sub.trialEnd && isFuture(sub.trialEnd)) return { status: "trialing" };

    const discount = promoCheckoutDiscount(readPromo(sub.metadata));
    const quote = await buildSubscriptionInvoiceQuote({
        memberId: sub.memberId,
        locationId, subscriptionId: sub.id, parentId: sub.parentId,
        subscriptionMetadata: sub.metadata, pricing: sub.pricing,
        memberPlanPricingId: sub.memberPlanPricingId, promoId: sub.promoId,
        location: sub.location, discount,
        periodStart: new Date(sub.currentPeriodStart), periodEnd: new Date(sub.currentPeriodEnd),
    });

    return { status: "active", quote };
}

/** Today's cash activation: the first invoice is sent for collection and the
 * subscription starts immediately. */
export async function activateCashSubscription(
    tx: DbTransaction,
    sub: BillableCashSubscription,
    locationId: string,
    activation: CashActivation,
) {
    const promoMeta = readPromo(sub.metadata);

    if (activation.status === "active") {
        await ensureCashInvoice(tx, {
            subscriptionId: sub.id, locationId, memberId: sub.memberId,
            periodStart: new Date(sub.currentPeriodStart), periodEnd: new Date(sub.currentPeriodEnd),
            quote: activation.quote,
        });
    }

    await tx.update(memberSubscriptions).set({
        status: activation.status,
        metadata: activation.status === "active" && promoMeta
            ? { ...sub.metadata, promo: { ...promoMeta, applied: true } }
            : undefined,
        updated: new Date(),
    }).where(eq(memberSubscriptions.id, sub.id));

    switch (activation.status) {
        case "trialing":
            // A staff-assigned trial needs no charge, but its activation must commit.
            if (!sub.parentId) {
                await dispatchWorkflowTrigger(tx, {
                    type: WorkflowEvents.trial.CHECKED_OUT,
                    locationId,
                    memberId: sub.memberId,
                });
            }

            return;
        case "active":
            await tx.update(memberLocations).set({
                status: "active",
                updated: new Date(),
            }).where(and(
                eq(memberLocations.memberId, sub.memberId),
                eq(memberLocations.locationId, locationId),
            ));

            if (promoMeta?.id && !promoMeta.applied) {
                await tx.update(promos).set({
                    redemptionCount: sql`${promos.redemptionCount} + 1`,
                    updated: new Date(),
                }).where(eq(promos.id, promoMeta.id));
            }

            return;
    }
}
