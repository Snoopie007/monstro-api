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
    planId: number,
    additionalFees: Array<Pick<AdditionalFee, "id" | "label" | "type" | "amount" | "taxable" | "refundable">>,
    promoData?: Pick<Promo, "redemptionCount" | "maxRedemptions" | "type" | "value">,
): OrderTotalResult {
    let subtotal = 0;
    const itemsWithTax: OrderLineItem[] = [];
    for (const item of items) {
        const variant = variants.find((variant) => variant.id === item.variantId);
        if (!variant) {
            throw new Error("Variant not found");
        }
        const unitCost = variant.salePrice ?? variant.price;
        const lineSubtotal = unitCost * item.quantity;
        subtotal += lineSubtotal;
        itemsWithTax.push({
            variantId: variant.id,
            quantity: item.quantity,
            productName: variant.name,
            unitCost,
            tax: 0,
        });
    }

    let discount;
    if (promoData) {
        const { redemptionCount, maxRedemptions, type, value } = promoData;
        if (maxRedemptions === null || redemptionCount < maxRedemptions) {
            discount = { type, value };
        }
    }

    const chargeDetails = calculateChargeDetails({
        amount: subtotal,
        discount,
        taxRate,
        planId,
        additionalFees,
    });

    let remainingProductDiscount = chargeDetails.productDiscount;
    let remainingProductAmount = subtotal;
    for (const item of itemsWithTax) {
        const lineAmount = item.unitCost * item.quantity;
        const lineDiscount = remainingProductAmount > 0
            ? Math.min(lineAmount, Math.floor(remainingProductDiscount * lineAmount / remainingProductAmount))
            : 0;
        item.discount = lineDiscount;
        item.tax = Math.floor(((lineAmount - lineDiscount) * taxRate) / 100);
        remainingProductDiscount -= lineDiscount;
        remainingProductAmount -= lineAmount;
    }
    if (remainingProductDiscount > 0 && itemsWithTax.length > 0) {
        const lastItem = itemsWithTax[itemsWithTax.length - 1]!;
        lastItem.discount = (lastItem.discount ?? 0) + remainingProductDiscount;
        lastItem.tax = Math.floor(
            ((lastItem.unitCost * lastItem.quantity - lastItem.discount) * taxRate) / 100,
        );
    }
    const productTax = chargeDetails.tax - chargeDetails.additionalFeeLines.reduce(
        (total, fee) => total + (fee.tax ?? 0),
        0,
    );
    const itemTax = itemsWithTax.reduce((total, item) => total + item.tax, 0);
    if (itemsWithTax.length > 0 && itemTax !== productTax) {
        itemsWithTax[itemsWithTax.length - 1]!.tax += productTax - itemTax;
    }

    return {
        total: chargeDetails.total,
        lineItems: itemsWithTax,
        discount: chargeDetails.discount,
        platformFeeAmount: chargeDetails.feesAmount,
        tax: chargeDetails.tax,
        subtotal,
        additionalFeeTotal: chargeDetails.additionalFeeTotal,
        additionalFeeLines: chargeDetails.additionalFeeLines,
    };
}
