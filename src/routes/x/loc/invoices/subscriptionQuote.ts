import { resolveInitialSubscriptionPricing } from "../subscriptions/effectivePricing";
import { getAddonOverview } from "../addonsBundles/subscriptionAddons";
import type { SubscriptionAddonOverview } from "@/subtrees/types";
import { getDeferredBilling, deferredChargeAmount } from "@/subtrees/utils/deferredBilling";
import type { AdditionalFee, CheckoutDiscount } from "@/subtrees/types";
import { getSubscriptionBillingQuote } from "@/subtrees/utils/subscriptionBilling";
import { countPaidSubscriptionInvoices } from "@/subtrees/utils/server/subscriptionInvoices";
import { db } from "@/db/db";
import { calculateChargeDetails } from "@/utils/enrollUtils";
import { getAdditionalFeesForCheckout } from "@/utils/additionalFees";
import { getCurrency } from "@/utils/getCurrency";

type SubscriptionPricing = {
    id: string;
    name: string;
    price: number;
    downpayment?: number | null;
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
    periodStart?: Date;
    periodEnd?: Date;
    discount?: CheckoutDiscount | number;
};

export function quoteSubscriptionInvoice({
    locationId,
    subscriptionId,
    parentId = null,
    subscriptionMetadata,
    pricing,
    memberPlanPricingId,
    promoId,
    location,
    billingPhase,
    discount,
    additionalFees,
    periodStart,
    effectivePricing,
    pricingSource,
}: BuildSubscriptionInvoiceQuoteProps & {
    billingPhase: "initial" | "renewal";
    additionalFees: AdditionalFee[];
    effectivePricing?: { id: string; name: string; price: number };
    pricingSource?: SubscriptionAddonOverview["pricingSource"];
}) {
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
    const effective = effectivePricing ?? { id: pricing.id, name: billingQuote.name, price: billingQuote.price };
    const taxRate = location.taxRates.find((rate) => rate.isDefault);
    const chargeDetails = calculateChargeDetails({
        amount: periodStart ? deferredChargeAmount(getDeferredBilling(subscriptionMetadata), periodStart, effective.price, pricing.downpayment) : effective.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        planId: location.locationState?.planId ?? 0,
        additionalFees,
    });
    const productName = pricing.plan?.name
        ? `${pricing.plan.name} - ${effective.name}`
        : effective.name;
    const attribution = {
        sourceType: "subscription" as const,
        sourceId: subscriptionId,
        pricingSource: pricingSource ?? { type: "base" as const },
        basePlanPricingId: pricing.id,
        effectivePlanPricingId: effective.id,
    };
    const productLines = [{
        name: productName,
        description: billingPhase === "renewal" ? "Subscription renewal" : "Subscription billing period",
        quantity: 1,
        price: chargeDetails.unitCost,
        discount: chargeDetails.productDiscount,
        ...attribution,
    }];

    return {
        items: [...productLines, ...chargeDetails.additionalFeeLines.map(line => ({ ...line, ...attribution }))],
        subTotal: chargeDetails.subTotal,
        total: chargeDetails.total,
        tax: chargeDetails.tax,
        discount: chargeDetails.discount,
        additionalFeeTotal: chargeDetails.additionalFeeTotal,
        platformFeeAmount: chargeDetails.feesAmount,
        currency: getCurrency(location.country),
        invoiceDescription: `${effective.name} - Billing Period`,
        transactionDescription: `${effective.name} - Recurring Payment`,
    };
}

export async function buildSubscriptionInvoiceQuote(props: BuildSubscriptionInvoiceQuoteProps & { memberId: string }) {
    const startsAtRenewal = props.subscriptionMetadata?.additionalFeesStartAtRenewal === true;
    const paidInvoiceCount = await countPaidSubscriptionInvoices(db, {
        subscriptionId: props.subscriptionId, memberId: props.memberId, locationId: props.locationId,
    });
    const billingPhase = props.billingPhase ?? (paidInvoiceCount || startsAtRenewal ? "renewal" : "initial");
    const promo = props.subscriptionMetadata?.promo as {
        discount?: { amount: number; duration?: number; type?: "fixed_amount" | "percentage"; value?: number };
    } | undefined;
    const discount = props.discount ?? (promo?.discount && paidInvoiceCount < (promo.discount.duration ?? 1)
        ? { type: promo.discount.type ?? "fixed_amount", value: promo.discount.value ?? promo.discount.amount }
        : undefined);
    const additionalFees = await getAdditionalFeesForCheckout(props.locationId, "subscription", billingPhase);
    const initial = billingPhase === "initial" ? await resolveInitialSubscriptionPricing(db, props.subscriptionId) : null;
    const overview = props.periodStart && props.periodEnd
        ? await getAddonOverview(props.locationId, props.subscriptionId, props.periodStart, props.periodEnd)
        : null;
    const bundle = initial?.pricingSource.type === "bundle" ? initial : null;
    return quoteSubscriptionInvoice({
        ...props, discount, billingPhase, additionalFees,
        effectivePricing: bundle?.pricing ?? (overview?.pricingSource.type !== "base" ? overview?.effectivePricing : undefined),
        pricingSource: bundle?.pricingSource ?? overview?.pricingSource,
    });
}
