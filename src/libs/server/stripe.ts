import { Member, MonstroPlan, PackagePaymentPlan, Vendor } from "@/types";
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

    public async createCustomer(vendor: Partial<Vendor>, token: string, metadata?: Record<string, any>) {
        if (!vendor.companyEmail || !vendor.phone || !vendor.firstName || !vendor.lastName) {
            throw new Error("Invalid Customer Info");
        }
        return await this._stripe.customers.create({
            name: `${vendor.firstName} ${vendor.lastName}`,
            email: vendor.companyEmail,
            phone: vendor.phone,
            source: token,
            ...(metadata && { metadata })
        });
    }

    public async getCustomer(customerId: string) {
        return await this._stripe.customers.retrieve(customerId);
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
        cardId: string | undefined,
        options?: {
            authorizeOnly?: boolean,
            statement?: string,
            description?: string
        }
    ): Promise<{ clientSecret: string }> {
        const option: Stripe.PaymentIntentCreateParams = {
            amount,
            description: options?.description,
            automatic_payment_methods: { enabled: true },
            currency: "usd",
            confirm: true,
            capture_method: options?.authorizeOnly ? "manual" : "automatic",
            customer: customerId,
            setup_future_usage: "off_session",
            statement_descriptor: "Monstro",
            ...(cardId && { payment_method: cardId }),
            return_url: "https://mymonstro.com",
        };

        const paymentIntent = await this._stripe.paymentIntents.create(option);
        return { clientSecret: paymentIntent.client_secret as string };
    }


    async createMemberPaymentIntent(
        amount: number,
        customerId: string,
        cardId: string | undefined,
        options?: {
            authorizeOnly?: boolean,
            statement?: string,
            description?: string
        }
    ) {
        const option: Stripe.PaymentIntentCreateParams = {
            amount,
            description: options?.description,
            automatic_payment_methods: { enabled: true },
            currency: "usd",
            confirm: true,
            customer: customerId,
            setup_future_usage: "off_session",
            statement_descriptor: "",
            ...(cardId && { payment_method: cardId }),
            return_url: "",
        }
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

    async createPaymentPlan(paymentPlan: PackagePaymentPlan, customer: string, vendorId: string, locationId: string) {
        const items = [{ price: paymentPlan.priceId }];
        const today = new Date();

        // Calculate exact number of days in the subscription period
        const monthsInMs = paymentPlan.length * 30.44 * 24 * 60 * 60 * 1000; // Using average month length of 30.44 days
        // Trial is already in days, so multiply by ms in a day
        const trialInMs = paymentPlan.trial * 24 * 60 * 60 * 1000;
        const cancelDate = new Date(today.getTime() + monthsInMs + trialInMs);

        const options: Stripe.SubscriptionCreateParams = {
            customer,
            description: `${paymentPlan.length} months payment plan`,
            items,
            cancel_at: Math.floor(cancelDate.getTime() / 1000), // Unix timestamp in seconds (UTC)
            trial_period_days: paymentPlan.trial,
            collection_method: 'charge_automatically',
            metadata: {
                vendorId: vendorId
            }
        };

        return this._stripe.subscriptions.create(options);
    }

    async createSubscription(plan: MonstroPlan, customer: string, vendorId: string, locationId: string, trial?: number) {
        const options: Stripe.SubscriptionCreateParams = {
            customer,
            description: `Monstro ${plan.name} Subscription`,
            items: [{ price: plan.priceId }],
            trial_period_days: trial || 0,
            metadata: {
                vendorId: vendorId,
                locationId: locationId
            }
        };
        return this._stripe.subscriptions.create(options);
    }

    async createMemberSubscription(priceId: string, customer: string, memberId: number, locationId: string, trial?: number) {
        const options: Stripe.SubscriptionCreateParams = {
            customer,
            description: `Member Subscription`,
            items: [{ price: priceId }],
            metadata: {
                memberId: memberId,
                locationId: locationId
            }
        };
        return this._stripe.subscriptions.create(options);
    }

    async getPaymentMethods(customerId: string, limit?: number) {
        return await this._stripe.customers.listPaymentMethods(customerId, { limit });
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

    async getInvoices(customerId: string) {
        const res = await this._stripe.charges.list({ customer: customerId, limit: 10 });
        return res.data;
    }

    async retryPayment(invoiceId: string, paymentMethod: string) {
        return await this._stripe.invoices.pay(invoiceId, { payment_method: paymentMethod });
    }
}

export { StripePayments };
