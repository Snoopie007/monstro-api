import type { OrderLineItem, ProductVariant, Promo } from "@subtrees/types";
import { calculateGatewayFeeAmount } from "./enrollUtils";
type OrderItems = {
    variantId: string;
    quantity: number;
}

type OrderTotalResult = {
    total: number;
    feesAmount: number;
    tax: number;
    subtotal: number;
    processingFee: number;
    lineItems: OrderLineItem[];
}
export function calculateOrderTotals(
    items: OrderItems[],
    variants: Pick<ProductVariant, "id" | "name" | "price">[],
    taxRate: number,
    passOnFees: boolean,
    usagePercent: number,
    promoData?: Pick<Promo, "redemptionCount" | "maxRedemptions" | "type" | "value">,
): OrderTotalResult {
    let subtotal = 0;
    let tax = 0;
    let total = 0;
    const itemsWithTax: OrderLineItem[] = [];
    for (const item of items) {
        const variant = variants.find((variant) => variant.id === item.variantId);
        if (!variant) {
            throw new Error("Variant not found");
        }
        const lineSubtotal = variant.price * item.quantity;
        subtotal += lineSubtotal;
        const totalTax = Math.floor((variant.price * taxRate) / 100);
        tax += totalTax;
        total += lineSubtotal + totalTax;
        itemsWithTax.push({
            variantId: variant.id,
            quantity: item.quantity,
            productName: variant.name,
            unitCost: variant.price,
            tax: Math.floor((variant.price * taxRate) / 100),
        });
    }


    let discount = 0;
    if (promoData) {
        const { redemptionCount, maxRedemptions, type, value } = promoData;
        if (redemptionCount < (maxRedemptions || 0)) {
            if (type === "fixed_amount") {
                discount = Math.min(value, subtotal);
            } else {
                discount = Math.floor(subtotal * (value / 100));
            }
        }
    }

    const processingFee = calculateGatewayFeeAmount(subtotal, 'card', false);

    if (passOnFees) {

        total += processingFee;
    }

    const feesAmount = Math.floor((subtotal * usagePercent) / 100);
    if (usagePercent > 0) {

        total += feesAmount;
    }

    return { total, lineItems: itemsWithTax, feesAmount, tax, subtotal, processingFee };
}

