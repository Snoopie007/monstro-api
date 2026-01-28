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


function getTaxRateId(taxRates: TaxRate[]): string | undefined {
    if (taxRates.length === 0) return undefined;
    const defaultTaxRate = taxRates.find((taxRate) => taxRate.isDefault);
    if (defaultTaxRate && defaultTaxRate.stripeRateId) {
        return defaultTaxRate.stripeRateId as string;
    } else {
        return taxRates[0]?.stripeRateId as string;
    }
}

function calculateTax(price: number, taxRates: TaxRate[]) {
    if (taxRates.length === 0) return 0;

    let tax = 0;
    let defaultTaxRate = taxRates.find((taxRate) => taxRate.isDefault);
    if (!defaultTaxRate) {
        defaultTaxRate = taxRates[0];
    }
    if (defaultTaxRate) {
        tax = Math.floor(price * (defaultTaxRate.percentage || 0) / 100);
    }

    return tax;
}

function calculateTrialEnd(startDate: Date, trialDays: number): Date {
    const today = new Date();
    if (isAfter(startDate, today)) {
        return new Date(
            Math.max(startDate.getTime(), startDate.getTime() + trialDays * 24 * 60 * 60 * 1000)
        );
    } else {
        return new Date(
            Math.max(today.getTime(), today.getTime() + trialDays * 24 * 60 * 60 * 1000)
        );
    }
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
    getTaxRateId,
    calculateTax,
    calculateThresholdDate,
    calculateTrialEnd,
    calculateStripeFeePercentage,
    calculateStripeFeeAmount,
};
