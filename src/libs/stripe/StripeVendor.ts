
import { addMonths } from "date-fns";
import Stripe from "stripe";
import { StripeBase, STRIPE_API_VERSION } from "./StripeBase";

interface VendorPaymentIntentOptions {
    authorizeOnly?: boolean;
    statement?: string;
    description?: string;
    metadata?: Record<string, any>;
}







const isProd = process.env.BUN_ENV === "production";


export class VendorStripePayments extends StripeBase {
    private _secretKey: string;
    constructor(secretKey?: string) {
        super(secretKey || process.env.STRIPE_SECRET_KEY!);
        this._secretKey = secretKey || process.env.STRIPE_SECRET_KEY!;
    }

    /**
     * Create a payment intent
     * @param amount - The amount to charge
     * @param cardId - The card id to charge
     * @param options - The options for the payment intent
     * @returns The client secret for the payment intent
     */
    async createPaymentIntent(
        amount: number,
        cardId: string | undefined,
        options?: VendorPaymentIntentOptions
    ) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const option: Stripe.PaymentIntentCreateParams = {
            amount,
            description: options?.description,
            automatic_payment_methods: { enabled: true },
            currency: "usd",
            confirm: true,
            capture_method: options?.authorizeOnly ? "manual" : "automatic",
            customer: this._customer,
            setup_future_usage: "off_session",
            statement_descriptor: "Monstro",
            metadata: options?.metadata || undefined,
            return_url: "https://app.monstro-x.com/stripe/success",
        };

        if (cardId) {
            option.payment_method = cardId;
        }

        const paymentIntent = await this._stripe.paymentIntents.create(option);
        return {
            clientSecret: paymentIntent.client_secret,
            paymentIntent: paymentIntent,
        };
    }

    /**
     * Create a reserve hold strip do not provide this in the sdk.
     * @param accountId - The account id
     * @param percentage - The percentage of the hold
     * @param lid - The location id
     * @returns The reserve hold
     */
    async createReserveHold(props: {
        accountId: string;
        amount: number;
        lid: string;
        releaseAfter: Date;
        source?: 'card' | 'bank_account';
    }) {

        const { accountId, amount, lid, releaseAfter, source } = props;
        const res = await fetch("https://api.stripe.com/v1/reserve/holds", {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(this._secretKey + ":").toString("base64")}`,
                "Stripe-Version": STRIPE_API_VERSION,
                "Stripe-Account": accountId,
                "Content-Type": "application/x-www-form-urlencoded",
            },
            body: JSON.stringify({
                amount,
                currency: "usd",
                release_schedule: {
                    release_after: Math.floor(releaseAfter.getTime() / 1000),
                },
                metadata: {
                    lid
                },
                ...(source && { source_type: source }),
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            console.log(data);
        }
        return data;
    }

    /**
     * Create a reserve plan
     * @param accountId - The account id
     * @param percentage - The percentage of the hold
     * @param lid - The location id
     * @returns The reserve plan
     */
    async createReservePlan(accountId: string, percentage: number, lid: string) {

        const res = await fetch("https://api.stripe.com/v1/reserve/holds", {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(this._secretKey + ":").toString("base64")}`,
                'Stripe-Version': STRIPE_API_VERSION,
                'Stripe-Account': accountId,
                'Content-Type': "application/x-www-form-urlencoded",
            },
            body: JSON.stringify({
                percentage,
                type: "rolling_release",
                currency: "usd",
                rolling_release: {
                    days_after_charge: 7,
                },
                metadata: {
                    lid
                }
            }),
        });

        const data = await res.json();
        if (!res.ok) {
            console.log(data);
        }
        return data;
    }

    async createScaleUpgrade(
        metadata: Record<string, any>,
        paymentMethodId?: string | undefined
    ) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const today = new Date();
        const endDate = addMonths(today, 12);

        const options: Stripe.SubscriptionCreateParams = {
            customer: this._customer,
            items: [{
                price: isProd ? 'price_1SO0hRDePDUzIffAeVml2g3g' : 'price_1SNgjhDePDUzIffADGAKBvN3',
            }],
            cancel_at: Math.floor(endDate.getTime() / 1000),
            metadata,
        };

        if (paymentMethodId) {
            options.default_payment_method = paymentMethodId;
        }

        return this._stripe.subscriptions.create(options);
    }


    async createGHLSubscription(metadata: Record<string, any>, paymentMethodId?: string | undefined) {
        const price = isProd ? "price_1R4WblDePDUzIffAvMQrZRFE" : "price_1R4S9xDePDUzIffAFUKu0ROH";
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const options: Stripe.SubscriptionCreateParams = {
            customer: this._customer,
            description: `Monstro Marketing Suite Subscription`,
            items: [{ price }],
            metadata,
            ...(paymentMethodId && { default_payment_method: paymentMethodId }),
        };
        return this._stripe.subscriptions.create(options);
    }
}

