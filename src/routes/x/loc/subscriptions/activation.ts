import type { db } from "@/db/db";
import { memberLocations, memberSubscriptions, promos } from "@/subtrees/schemas";
import type { CheckoutDiscount } from "@/subtrees/types";
import { getAdditionalFeesForCheckout } from "@/utils/additionalFees";
import { calculateChargeDetails } from "@/utils/enrollUtils";
import { and, eq, sql } from "drizzle-orm";
import { resolveInitialSubscriptionPricing } from "./effectivePricing";
import type { PromoDiscount } from "./shared";

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
type Reader = Pick<typeof db, "query">;

type StoredPromo = {
    id?: string;
    discount?: PromoDiscount;
    applied?: boolean;
};

export function readPromo(metadata: Record<string, unknown>): StoredPromo | undefined {
    // SAFETY: enrollment stores metadata.promo in this shape; activation only reads it back.
    return metadata.promo as StoredPromo | undefined;
}

/** A bundle price replaces the plan price, downpayment included. */
export function initialDownpayment(
    pricingSource: { type: string },
    pricing: { downpayment: number | null },
): number | null {
    return pricingSource.type === "bundle" ? null : pricing.downpayment || null;
}

type ChargeableSubscription = {
    id: string;
    pricing: { downpayment: number | null; plan: { name: string } | null };
    location: {
        taxRates: Array<{ percentage: number; isDefault: boolean }>;
        locationState: { planId: number } | null;
    };
};

/** Prices a subscription's first charge. Takes a transaction so bundle checkout
 * can price subscriptions it has inserted but not committed. */
export async function quoteInitialSubscriptionCharge(database: Reader, input: {
    subscription: ChargeableSubscription;
    locationId: string;
    discount?: CheckoutDiscount;
}) {
    const { subscription, locationId, discount } = input;
    const taxRate = subscription.location.taxRates.find((rate) => rate.isDefault) || subscription.location.taxRates[0];
    const { pricing, basePricing, pricingSource } = await resolveInitialSubscriptionPricing(database, subscription.id);
    const planName = subscription.pricing.plan?.name
        ? `${subscription.pricing.plan.name}/${pricing.name}`
        : pricing.name;
    const downpayment = initialDownpayment(pricingSource, subscription.pricing);
    const isDownpayment = downpayment !== null;
    const additionalFees = await getAdditionalFeesForCheckout(locationId, "subscription", "initial", database);
    const chargeDetails = calculateChargeDetails({
        amount: downpayment ?? pricing.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        planId: subscription.location.locationState?.planId ?? 0,
        additionalFees,
    });
    const attribution = {
        sourceType: "subscription" as const,
        sourceId: subscription.id,
        pricingSource,
        basePlanPricingId: basePricing.id,
        effectivePlanPricingId: pricing.id,
    };
    const serviceLine = {
        name: planName,
        description: isDownpayment ? "Subscription downpayment" : "Subscription billing period",
        quantity: 1,
        price: chargeDetails.unitCost,
        discount: chargeDetails.productDiscount,
        ...attribution,
    };
    const feeLines = chargeDetails.additionalFeeLines.map(line => ({ ...line, ...attribution }));

    return {
        taxRate,
        pricing,
        planName,
        isDownpayment,
        chargeDetails,
        serviceLine,
        feeLines,
        lineItems: [serviceLine, ...feeLines],
    };
}

/** The subscription writes for a first payment. A payment that is still
 * settling only saves the payment method; a finalized one also activates the
 * subscription and the member's location. */
export async function markSubscriptionActivated(tx: Transaction, input: {
    subscription: { id: string; memberId: string; locationId: string; metadata: Record<string, unknown> };
    payment: {
        paymentMethodId: string;
        gatewayService: string;
        gatewayIntegrationId: string;
        gatewayCustomerId: string;
    };
    paidDownpayment: boolean;
    finalized: boolean;
}) {
    const { subscription, payment, finalized } = input;
    const promo = readPromo(subscription.metadata);

    await tx.update(memberSubscriptions).set({
        gatewayPaymentId: payment.paymentMethodId,
        // Drizzle leaves undefined columns untouched.
        status: finalized ? "active" : undefined,
        metadata: {
            ...subscription.metadata,
            hasPaidDownpayment: input.paidDownpayment,
            paymentMethodId: payment.paymentMethodId,
            gatewayService: payment.gatewayService,
            gatewayIntegrationId: payment.gatewayIntegrationId,
            gatewayCustomerId: payment.gatewayCustomerId,
            promo: promo ? { ...promo, applied: true } : subscription.metadata.promo,
        },
    }).where(eq(memberSubscriptions.id, subscription.id));

    if (finalized) {
        await tx.update(memberLocations).set({
            status: "active",
            updated: new Date(),
        }).where(and(
            eq(memberLocations.memberId, subscription.memberId),
            eq(memberLocations.locationId, subscription.locationId),
        ));
    }

    if (promo?.id && !promo.applied) {
        await tx.update(promos).set({
            redemptionCount: sql`${promos.redemptionCount} + 1`,
            updated: new Date(),
        }).where(eq(promos.id, promo.id));
    }
}
