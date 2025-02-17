import { Member } from "@/types";
import Stripe from "stripe";


class StripePayments {
    private _stripe: Stripe;

    constructor(key?: string) {
        this._stripe = new Stripe(key || process.env.STRIPE_SECRET_KEY!, {
            apiVersion: "2025-01-27.acacia",
            appInfo: {
                name: "My Monstro",
                url: "https://mymonstro.com", // Fixed typo in URL
            },
        });
    }

    public async createCustomer(member: Member, token: string, billingInfo?: { name: string, address: string, phone: string }) {
        if (!member.email || !member.phone || !member.firstName || !member.lastName) {
            throw new Error("Invalid Customer Info");
        }
        return await this._stripe.customers.create({
            name: `${member.firstName} ${member.lastName}`,
            email: member.email,
            phone: member.phone,
            source: token,
            metadata: {
                memberId: `${member.id}`,
            },
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
            statement_descriptor: "",
            payment_method: cardId,
            return_url: "",
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

    async createSubscription(customer: string, price: string, paymentMethodId?: string, trial?: number) {
        const options: Stripe.SubscriptionCreateParams = {
            customer,
            items: [{ price }],
            trial_period_days: trial || 0,
            ...(paymentMethodId && { default_payment_method: paymentMethodId })
        };
        return this._stripe.subscriptions.create(options);
    }

    async getPaymentMethods(customerId: string) {
        return await this._stripe.customers.listPaymentMethods(customerId);
    }

    async setupIntent(source: string, customerId: string, type?: string) {
        const option: Record<string, any> = {
            customer: customerId,
            confirm: true,
            payment_method_data: {
                type: 'card',
                card: {
                    token: source
                }
            },
            payment_method_types: type ? [type] : ["card"],
        };
        return await this._stripe.setupIntents.create(option);
    }

    async getSubscriptions(customerId: string) {
        return await this._stripe.subscriptions.list({ customer: customerId, limit: 10 });
    }
}

export { StripePayments };
