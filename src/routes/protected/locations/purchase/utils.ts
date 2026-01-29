import type { PaymentType, TaxRate } from "@/types";
import { addDays, addMonths, addWeeks, addYears, isAfter } from "date-fns";

const STRIPE_FEE_PERCENT = 2.9
const STRIPE_FEE_AMOUNT = 0.30
const STRIPE_BANK_FEE = 0.8;

function calculateStripeFeePercentage(amount: number, paymentType: PaymentType) {
    if (paymentType === 'us_bank_account') {
        return STRIPE_BANK_FEE;
    }
    const additionalPercentage = Number(((STRIPE_FEE_AMOUNT / (amount / 100)) * 100).toFixed(2))
    return Number((additionalPercentage + STRIPE_FEE_PERCENT).toFixed(2))
}

function calculateStripeFeeAmount(amount: number, paymentType: PaymentType) {
    const stripeFeePercentage = calculateStripeFeePercentage(amount, paymentType);
    return Math.floor(amount * (stripeFeePercentage / 100));
}



function calculateTax(price: number, taxRate: TaxRate | undefined) {
    if (!taxRate) return 0;
    const tax = Math.floor(price * (taxRate.percentage || 0) / 100);
    return tax;
}

interface EndDateParams {
    startDate: Date,
    threshold: number,
    interval: 'day' | 'week' | 'month' | 'year'
}

function calculateThresholdDate({ startDate, threshold, interval }: EndDateParams) {
    switch (interval) {
        case "day":
            return addDays(startDate, threshold);
        case "week":
            return addWeeks(startDate, threshold);
        case "month":
            return addMonths(startDate, threshold);
        case "year":
            return addYears(startDate, threshold);
    }
}


export {
    calculateTax,
    calculateThresholdDate,
    calculateStripeFeePercentage,
    calculateStripeFeeAmount,
};
