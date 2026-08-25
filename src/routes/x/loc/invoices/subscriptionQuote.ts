import type { CheckoutDiscount } from "@subtrees/types";
import { memberInvoices } from "@subtrees/schemas";
import { and, eq } from "drizzle-orm";
import { db } from "@/db/db";
import { calculateChargeDetails, getAdditionalFeesForCheckout, getCurrency } from "@/utils";

type SubscriptionPricing = {
    name: string;
    price: number;
    plan?: {
        name: string;
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
    subscriptionMetadata?: Record<string, unknown>;
    pricing: SubscriptionPricing;
    location: SubscriptionLocation;
    billingPhase?: "initial" | "renewal";
    discount?: CheckoutDiscount | number;
};

export async function buildSubscriptionInvoiceQuote({
    locationId,
    subscriptionId,
    subscriptionMetadata,
    pricing,
    location,
    billingPhase: requestedBillingPhase,
    discount,
}: BuildSubscriptionInvoiceQuoteProps) {
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
    const taxRate = location.taxRates.find((rate) => rate.isDefault) ?? location.taxRates[0];
    const chargeDetails = calculateChargeDetails({
        amount: pricing.price,
        discount,
        taxRate: taxRate?.percentage ?? 0,
        planId: location.locationState?.planId ?? 0,
        additionalFees,
    });
    const productName = pricing.plan?.name
        ? `${pricing.plan.name} - ${pricing.name}`
        : pricing.name;

    return {
        items: [{
            name: productName,
            description: billingPhase === "renewal"
                ? "Subscription renewal"
                : "Subscription billing period",
            quantity: 1,
            price: chargeDetails.unitCost,
            discount: chargeDetails.productDiscount,
        }, ...chargeDetails.additionalFeeLines],
        subTotal: chargeDetails.subTotal,
        total: chargeDetails.total,
        tax: chargeDetails.tax,
        discount: chargeDetails.discount,
        additionalFeeTotal: chargeDetails.additionalFeeTotal,
        platformFeeAmount: chargeDetails.feesAmount,
        currency: getCurrency(location.country),
        invoiceDescription: `${pricing.name} - Billing Period`,
        transactionDescription: `${pricing.name} - Recurring Payment`,
    };
}
