import type { AdditionalFee, InvoiceItem, OrderLineItem, Promo } from "@subtrees/types";

import { calculateChargeDetails } from "./enrollUtils";
import type { MercVariant } from "@subtrees/types/mercs";
type OrderItems = {
    variantId: string;
    quantity: number;
}

type OrderTotalResult = {
    total: number;
    platformFeeAmount: number;
    tax: number;
    subtotal: number;
    discount: number;
    additionalFeeTotal: number;
    additionalFeeLines: InvoiceItem[];
    lineItems: OrderLineItem[];
}
export function calculateOrderTotals(
    items: OrderItems[],
    variants: Array<Pick<MercVariant, "id" | "name" | "price" | "salePrice">>,
    taxRate: number,
    usagePercent: number,
    additionalFees: Array<Pick<AdditionalFee, "id" | "label" | "type" | "amount" | "taxable">>,
    promoData?: Pick<Promo, "redemptionCount" | "maxRedemptions" | "type" | "value">,
): OrderTotalResult {
    let subtotal = 0;
    let tax = 0;
    const itemsWithTax: OrderLineItem[] = [];
    for (const item of items) {
        const variant = variants.find((variant) => variant.id === item.variantId);
        if (!variant) {
            throw new Error("Variant not found");
        }
        const unitCost = variant.salePrice ?? variant.price;
        const lineSubtotal = unitCost * item.quantity;
        subtotal += lineSubtotal;
        const totalTax = Math.floor((lineSubtotal * taxRate) / 100);
        tax += totalTax;
        itemsWithTax.push({
            variantId: variant.id,
            quantity: item.quantity,
            productName: variant.name,
            unitCost,
            tax: totalTax,
        });
    }


    let discount = 0;
    if (promoData) {
        const { redemptionCount, maxRedemptions, type, value } = promoData;
        if (maxRedemptions === null || redemptionCount < maxRedemptions) {
            if (type === "fixed_amount") {
                discount = Math.min(value, subtotal);
            } else {
                discount = Math.floor(subtotal * (value / 100));
            }
        }
    }

    const chargeDetails = calculateChargeDetails({
        amount: subtotal,
        discount,
        taxRate,
        taxAmount: tax,
        usagePercent,
        platformFeeBase: subtotal,
        additionalFees,
    });

    return {
        total: chargeDetails.total,
        lineItems: itemsWithTax,
        discount,
        platformFeeAmount: chargeDetails.feesAmount,
        tax: chargeDetails.tax,
        subtotal,
        additionalFeeTotal: chargeDetails.additionalFeeTotal,
        additionalFeeLines: chargeDetails.additionalFeeLines,
    };
}
