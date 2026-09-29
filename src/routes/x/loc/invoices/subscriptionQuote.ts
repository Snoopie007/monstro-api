import type { CheckoutDiscount } from "@subtrees/types";
import { getSubscriptionBillingQuote } from "@subtrees/utils/subscriptionBilling";
import { memberInvoices } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { calculateChargeDetails, getAdditionalFeesForCheckout, getCurrency } from "@/utils";

type SubscriptionPricing = {
    id: string;
    name: string;
    price: number;
    interval: "day" | "week" | "month" | "year" | null;
    intervalThreshold: number | null;
    plan?: {
        name?: string;
        locationId: string;
    } | null;
};

type SubscriptionBillingItem = {
    rootSubscriptionId: string;
    participantSubscriptionId: string;
    pricingId: string;
    quantity: number;
    pricing: SubscriptionPricing | null;
    participant: {
        parentId: string | null;
        locationId: string | null;
        memberPlanPricingId: string | null;
    } | null;
};

type SubscriptionLocation = {
    country: string;
    locationState?: {
        planId: number;
    } | null;
    taxRates: Array<{
        percentage: number;
        isDefault: boolean;
    }>;
};

type BuildSubscriptionInvoiceQuoteProps = {
    locationId: string;
    subscriptionId: string;
    parentId?: string | null;
    subscriptionMetadata?: Record<string, unknown> | null;
    pricing?: SubscriptionPricing | null;
    billingItems?: SubscriptionBillingItem[];
    memberPlanPricingId?: string | null;
    isParticipant?: boolean;
    promoId?: string | null;
    location: SubscriptionLocation;
    billingPhase?: "initial" | "renewal";
    discount?: CheckoutDiscount | number;
};

export async function buildSubscriptionInvoiceQuote({
    locationId,
    subscriptionId,
    parentId = null,
    subscriptionMetadata,
    pricing,
    billingItems,
    memberPlanPricingId,
    isParticipant = false,
    promoId,
    location,
    billingPhase: requestedBillingPhase,
    discount,
}: BuildSubscriptionInvoiceQuoteProps) {
    const billingQuote = getSubscriptionBillingQuote({
        id: subscriptionId,
        parentId,
        locationId,
        isParticipant,
        memberPlanPricingId: memberPlanPricingId ?? pricing?.id ?? null,
        promoId,
        metadata: subscriptionMetadata,
        pricing: pricing
            ? {
                id: pricing.id,
                name: pricing.name,
                price: pricing.price,
                interval: pricing.interval,
                intervalThreshold: pricing.intervalThreshold,
                plan: pricing.plan ? { locationId: pricing.plan.locationId } : null,
            }
            : null,
        billingItems: billingItems?.map((item) => ({
            ...item,
            pricing: item.pricing
                ? {
                    id: item.pricing.id,
                    name: item.pricing.name,
                    price: item.pricing.price,
                    interval: item.pricing.interval,
                    intervalThreshold: item.pricing.intervalThreshold,
                    plan: item.pricing.plan ? { locationId: item.pricing.plan.locationId } : null,
                }
                : null,
        })),
    });
    const startsAtRenewal = subscriptionMetadata?.additionalFeesStartAtRenewal === true;
    const paidInvoice = requestedBillingPhase || startsAtRenewal
        ? undefined
        : await db.query.memberInvoices.findFirst({
            where: and(
                eq(memberInvoices.memberPlanId, subscriptionId),
                eq(memberInvoices.paid, true),
            ),
            columns: { id: true },
        });
    const billingPhase = requestedBillingPhase
        ?? (paidInvoice || startsAtRenewal
            ? "renewal"
            : "initial");
    const additionalFees = await getAdditionalFeesForCheckout(
        locationId,
        "subscription",
        billingPhase,
    );
    const taxRate = location.taxRates.find((rate) => rate.isDefault);
    const chargeDetails = calculateChargeDetails({
        amount: billingQuote.price,
        discount: billingItems?.length ? undefined : discount,
        taxRate: taxRate?.percentage ?? 0,
        planId: location.locationState?.planId ?? 0,
        additionalFees,
    });
    const productName = pricing?.plan?.name
        ? `${pricing.plan.name} - ${pricing.name}`
        : billingQuote.name;
    const productLines = billingItems?.length
        ? billingQuote.items.map((item) => ({
            name: item.name,
            description: billingPhase === "renewal" ? "Subscription renewal" : "Subscription billing period",
            quantity: item.quantity,
            price: item.price,
        }))
        : [{
            name: productName,
            description: billingPhase === "renewal" ? "Subscription renewal" : "Subscription billing period",
            quantity: 1,
            price: chargeDetails.unitCost,
            discount: chargeDetails.productDiscount,
        }];

    return {
        items: [...productLines, ...chargeDetails.additionalFeeLines],
        subTotal: chargeDetails.subTotal,
        total: chargeDetails.total,
        tax: chargeDetails.tax,
        discount: chargeDetails.discount,
        additionalFeeTotal: chargeDetails.additionalFeeTotal,
        platformFeeAmount: chargeDetails.feesAmount,
        currency: getCurrency(location.country),
        invoiceDescription: `${billingQuote.name} - Billing Period`,
        transactionDescription: `${billingQuote.name} - Recurring Payment`,
    };
}
