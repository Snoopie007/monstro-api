import { Stripe, loadStripe } from '@stripe/stripe-js';

let stripePromise: Promise<Stripe | null>;

export const getStripe = (key: string) => {

    if (!stripePromise) {
        stripePromise = loadStripe(key);
    }
    return stripePromise;
};

