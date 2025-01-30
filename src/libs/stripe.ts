import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = (key?: string) => {

    if (!stripePromise) {
        stripePromise = loadStripe(key || process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY!);
    }
    return stripePromise;
};


export function formatAmountForDisplay(
    amount: number,
    currency: string,
    style: boolean = true,
    fractionDigit?: number | undefined

): string {
    let numberFormat = new Intl.NumberFormat(['en-US'], {

        currency: currency,
        currencyDisplay: 'symbol',
        maximumFractionDigits: fractionDigit || 0,
        ...(style ? { style: 'currency' } : {}),

    })
    return numberFormat.format(amount)
}