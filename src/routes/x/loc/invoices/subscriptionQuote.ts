import type { CheckoutDiscount } from "@/subtrees/types";
import { getSubscriptionBillingQuote } from "@/subtrees/utils/subscriptionBilling";
import { memberInvoices } from "@/subtrees/schemas";
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
    pricing: SubscriptionPricing;
    memberPlanPricingId?: string | null;
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
    memberPlanPricingId,
    promoId,
    location,
    billingPhase: requestedBillingPhase,
    discount,
}: BuildSubscriptionInvoiceQuoteProps) {
    const billingQuote = getSubscriptionBillingQuote({
        id: subscriptionId,
        parentId,
        locationId,
        memberPlanPricingId: memberPlanPricingId ?? pricing.id,
        promoId,
        metadata: subscriptionMetadata,
        pricing: {
            id: pricing.id,
            name: pricing.name,
            price: pricing.price,
            interval: pricing.interval,
            intervalThreshold: pricing.intervalThreshold,
            plan: pricing.plan ? { locationId: pricing.plan.locationId } : null,
        },
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
        discount,
        taxRate: taxRate?.percentage ?? 0,
        planId: location.locationState?.planId ?? 0,
        additionalFees,
    });
    const productName = pricing.plan?.name
        ? `${pricing.plan.name} - ${pricing.name}`
        : billingQuote.name;
    const productLines = [{
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
