import { getDeferredBilling, deferredChargeAmount } from "@/subtrees/utils/deferredBilling";
import type { AdditionalFee, CheckoutDiscount } from "@/subtrees/types";
import { getSubscriptionBillingQuote } from "@/subtrees/utils/subscriptionBilling";
import { memberInvoices } from "@/subtrees/schemas";
import { and, eq } from "drizzle-orm";
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
}: BuildSubscriptionInvoiceQuoteProps & {
    billingPhase: "initial" | "renewal";
    additionalFees: AdditionalFee[];
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
    const taxRate = location.taxRates.find((rate) => rate.isDefault);
    const chargeDetails = calculateChargeDetails({
        amount: periodStart ? deferredChargeAmount(getDeferredBilling(subscriptionMetadata), periodStart, billingQuote.price, pricing.downpayment) : billingQuote.price,
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

export async function buildSubscriptionInvoiceQuote(props: BuildSubscriptionInvoiceQuoteProps) {
    const startsAtRenewal = props.subscriptionMetadata?.additionalFeesStartAtRenewal === true;
    const paidInvoices = await db.query.memberInvoices.findMany({
            where: and(
                eq(memberInvoices.memberPlanId, props.subscriptionId),
                eq(memberInvoices.locationId, props.locationId),
                eq(memberInvoices.paid, true),
            ),
            columns: { id: true },
        });
    const billingPhase = props.billingPhase ?? (paidInvoices.length || startsAtRenewal ? "renewal" : "initial");
    const promo = props.subscriptionMetadata?.promo as {
        discount?: { amount: number; duration?: number; type?: "fixed_amount" | "percentage"; value?: number };
    } | undefined;
    const discount = props.discount ?? (promo?.discount && paidInvoices.length < (promo.discount.duration ?? 1)
        ? { type: promo.discount.type ?? "fixed_amount", value: promo.discount.value ?? promo.discount.amount }
        : undefined);
    const additionalFees = await getAdditionalFeesForCheckout(props.locationId, "subscription", billingPhase);
    return quoteSubscriptionInvoice({ ...props, discount, billingPhase, additionalFees });
}
