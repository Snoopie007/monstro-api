import Stripe from "stripe";

interface Owner {
    email: string;
    phone: string;
    firstName: string;
    lastName: string;
}

interface Plan {
    planId: string;
    testId: string;
    seoPlanId?: string;
    couponId?: string;
    trial?: string | number;
}

class StripePayments {
    private _stripe: Stripe;

    constructor() {
        this._stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2024-11-20.acacia",
            appInfo: {
                name: "My Monstro",
                url: "https://mymonstro.com", // Fixed typo in URL
            },
        });
    }

    public async createCustomer(data: Owner, token: string) {
        if (!data.email || !data.phone || !data.firstName || !data.lastName) {
            throw new Error("Invalid Customer Info");
        }
        return await this._stripe.customers.create({
            name: `${data.firstName} ${data.lastName}`,
            email: data.email,
            phone: data.phone,
            source: token,
        });
    }

    async updatePaymentMethod(
        id: string,
        update: Stripe.PaymentMethodUpdateParams
    ) {
        return await this._stripe.paymentMethods.update(id, update);
    }

    async createSetupIntent(customerId: string, cardId: string) {
        const option: Stripe.SetupIntentCreateParams = {
            automatic_payment_methods: { enabled: true },
            customer: customerId,
            usage: "off_session",
            payment_method: cardId,
        };
        const setupIntent = await this._stripe.setupIntents.create(option);
        return setupIntent;
    }

    async createPaymentIntent(
        amount: number,
        customerId: string,
        cardId: string,
        authorizeOnly: boolean = false
    ): Promise<{ clientSecret: string }> {
        const option: Stripe.PaymentIntentCreateParams = {
            amount,
            automatic_payment_methods: { enabled: true },
            currency: "usd",
            confirm: true,
            capture_method: authorizeOnly ? "manual" : "automatic",
            customer: customerId,
            setup_future_usage: "off_session",
            statement_descriptor: "mymonstro.com",
            payment_method: cardId,
            return_url: "https://mymonstro.com",
        };

        const paymentIntent = await this._stripe.paymentIntents.create(option);
        return { clientSecret: paymentIntent.client_secret as string };
    }

    async retrievePaymentMethod(customerId: string, paymentId: string) {
        return await this._stripe.customers.retrievePaymentMethod(
            customerId,
            paymentId
        );
    }

    async updateCustomer(id: string, updates: Stripe.CustomerUpdateParams) {
        return await this._stripe.customers.update(id, updates);
    }

    async createPaymentPlan(price: string, customer: string, trial: number) {
        // const price = process.env.NODE_ENV === "production" ? subscriptions.planId : subscriptions.testId;
        // if (!price) throw new Error("Invalid Payment Plan");
        const items = [{ price }]
        const options: Stripe.SubscriptionCreateParams = {
            customer,
            description: "Thanks for subscribing to Monstro. For support email support@mymonstro.com.",
            items,
            cancel_at: Math.floor(new Date().setDate(new Date().getDate() + 396) / 1000), // Unix timestamp in seconds (UTC) - today + 30 days + 1 year + 1 day
            trial_period_days: trial || 0,
        };

        return this._stripe.subscriptions.create(options);
    }

    async createSubscription(customer: string) {
        // const price = process.env.NODE_ENV === "production" ? subscriptions.planId : subscriptions.testId;
        // if (!price) throw new Error("Invalid Plan");

        const items = [{ price: "price_1NVhoxDePDUzIffAPzStEiBA" }]

        const options: Stripe.SubscriptionCreateParams = {
            customer,
            description: "Thanks for subscribing to Monstro. For support email support@mymonstro.com.",
            items,
            trial_period_days: 365,
        };

        return this._stripe.subscriptions.create(options);
    }
}

export { StripePayments };
