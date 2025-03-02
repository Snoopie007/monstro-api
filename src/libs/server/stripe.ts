import { db } from "@/db/db";
import { Member, MonstroPlan, PackagePaymentPlan, Vendor } from "@/types";
import { isAfter, isBefore, isSameDay } from "date-fns";
import Stripe from "stripe";

type Customer = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

abstract class BaseStripePayments {
    protected _stripe: Stripe;
    protected _customer: string | null = null;


    constructor(key: string) {
        this._stripe = new Stripe(key, {
            apiVersion: "2025-01-27.acacia",
            appInfo: {
                name: "My Monstro",
                url: "https://mymonstro.com",
            },
        });
    }

    public setCustomer(customer: string) {
        this._customer = customer;
        return this
    }

    public async createCustomer(customer: Customer, token: string, metadata?: Record<string, any>) {
        return await this._stripe.customers.create({
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone,
            source: token,
            ...(metadata && { metadata })
        });
    }



    async updatePaymentMethod(id: string, update: Stripe.PaymentMethodUpdateParams) {
        return await this._stripe.paymentMethods.update(id, update);
    }

    async createSetupIntent(customerId: string, cardId: string) {
        const option: Stripe.SetupIntentCreateParams = {
            automatic_payment_methods: { enabled: true },
            customer: customerId,
            usage: "off_session",
            payment_method: cardId,
        };
        return await this._stripe.setupIntents.create(option);
    }

    async retrievePaymentMethod(customerId: string, paymentId: string) {
        return await this._stripe.customers.retrievePaymentMethod(customerId, paymentId);
    }

    async updateCustomer(id: string, updates: Stripe.CustomerUpdateParams) {
        return await this._stripe.customers.update(id, updates);
    }

    async getPaymentMethods(customerId: string, limit?: number) {
        return await this._stripe.customers.listPaymentMethods(customerId, { limit });
    }

    async setupIntent(source: string, type?: string) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const option: Record<string, any> = {
            customer: this._customer,
            confirm: true,
            payment_method_data: {
                type: 'card',
                card: {
                    token: source
                }
            },
            payment_method_types: type ? [type] : ["card"],
            expand: ["payment_method"]
        };
        const { client_secret, payment_method } = await this._stripe.setupIntents.create(option);

        return { clientSecret: client_secret as string, paymentMethod: payment_method as Stripe.PaymentMethod };
    }

    async getSubscriptions(customerId: string, limit?: number) {
        return await this._stripe.subscriptions.list({ customer: customerId, limit: 10 });
    }

    async getCharges(customerId: string, limit?: number) {
        const res = await this._stripe.charges.list({ limit: limit || 10 });
        return res.data;
    }

    async getInvoices(customerId: string, limit?: number) {
        const res = await this._stripe.invoices.list({ customer: customerId, limit: limit || 10 });
        return res.data;
    }

    async retryPayment(invoiceId: string, paymentMethod: string) {
        return await this._stripe.invoices.pay(invoiceId, { payment_method: paymentMethod });
    }

    async refund(chargeId: string) {
        return await this._stripe.refunds.create({ charge: chargeId });
    }
}

class VendorStripePayments extends BaseStripePayments {
    constructor() {
        super(process.env.STRIPE_SECRET_KEY!);
    }

    async connectOAuth(code: string, scope?: string) {
        return await this._stripe.oauth.token({
            grant_type: "authorization_code",
            code,
            scope: scope || "read_write"
        });
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

    async createPaymentPlan(paymentPlan: PackagePaymentPlan, customer: string, vendorId: string, locationId: string) {
        const items = [{ price: paymentPlan.priceId }];
        const today = new Date();
        const monthsInMs = paymentPlan.length * 30.44 * 24 * 60 * 60 * 1000;
        const trialInMs = paymentPlan.trial * 24 * 60 * 60 * 1000;
        const cancelDate = new Date(today.getTime() + monthsInMs + trialInMs);

        const options: Stripe.SubscriptionCreateParams = {
            customer,
            description: `${paymentPlan.length} months payment plan`,
            items,
            cancel_at: Math.floor(cancelDate.getTime() / 1000),
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
            trial_end: new Date('2025-03-1').getTime() / 1000,
            billing_cycle_anchor: new Date('2025-03-1').getTime() / 1000,
            metadata: {
                vendorId: vendorId,
                locationId: locationId
            }
        };
        return this._stripe.subscriptions.create(options);
    }

    createSubSchedule(priceId: string, startDate: Date, endDate: Date, metadata: Record<string, any>) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const options: Stripe.SubscriptionScheduleCreateParams = {
            customer: this._customer,
            start_date: new Date(startDate).getTime() / 1000,
            end_behavior: "release",
            phases: [{
                items: [{ price: priceId }],
                billing_cycle_anchor: 'automatic',
                ...(endDate && { end_date: new Date(endDate).getTime() / 1000 }),
                currency: 'usd',
                collection_method: 'charge_automatically',

            }],
            metadata
        }
        return this._stripe.subscriptionSchedules.create(options);
    }
}

type BaseStripeSettings = {
    description?: string,
    applicationFeePercent?: number,
    currency?: string,
    returnUrl?: string,
    paymentMethod?: string,
    metadata?: Record<string, any>
}

interface MemberSubscriptionSettings extends BaseStripeSettings {
    endDate: Date | null | undefined,
    trialEnd: Date | null | undefined,
}

interface PaymentIntentSettings extends BaseStripeSettings {
    authorizeOnly?: boolean,
}

class MemberStripePayments extends BaseStripePayments {
    constructor(key: string) {
        super(key);
    }

    async createPaymentIntent(amount: number, settings?: PaymentIntentSettings) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }

        const applicationFeeAmount = Math.floor((amount * ((settings?.applicationFeePercent || 0) / 100)));

        const option: Stripe.PaymentIntentCreateParams = {
            amount,
            description: settings?.description,
            automatic_payment_methods: { enabled: true },
            currency: settings?.currency || "usd",
            confirm: true,
            customer: this._customer,
            setup_future_usage: "off_session",
            application_fee_amount: applicationFeeAmount,
            payment_method: settings?.paymentMethod || undefined,
            capture_method: settings?.authorizeOnly ? "manual" : "automatic",
            return_url: settings?.returnUrl || "https://unknown.com",
            expand: ["payment_method"]
        }
        const { client_secret, payment_method } = await this._stripe.paymentIntents.create(option);
        return { clientSecret: client_secret as string, paymentMethod: payment_method };
    }



    async createSubscription(priceId: string, startDate: Date | undefined, settings: MemberSubscriptionSettings) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const { endDate, trialEnd, paymentMethod, applicationFeePercent, ...rest } = settings;

        const options: Stripe.SubscriptionCreateParams = {
            ...rest,
            customer: this._customer,
            description: `Member Subscription`,
            items: [{ price: priceId }],
            collection_method: "charge_automatically",
            application_fee_percent: (applicationFeePercent || 0),
            default_payment_method: paymentMethod || undefined,
            cancel_at: endDate ? endDate.getTime() / 1000 : undefined,

            trial_end: trialEnd ? trialEnd.getTime() / 1000 : undefined,
            ...(startDate && isAfter(startDate, new Date()) && {
                billing_cycle_anchor: startDate.getTime() / 1000,
                trial_end: trialEnd ? trialEnd.getTime() / 1000 : undefined,
            }),
        };

        return this._stripe.subscriptions.create(options);
    }

    createSubSchedule(priceId: string, startDate: Date, settings: MemberSubscriptionSettings): Promise<Stripe.SubscriptionSchedule> {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const { endDate, paymentMethod, applicationFeePercent, ...rest } = settings;

        const options: Stripe.SubscriptionScheduleCreateParams = {
            customer: this._customer,
            start_date: new Date(startDate).getTime() / 1000,
            end_behavior: "release",

            phases: [{
                items: [{ price: priceId }],
                billing_cycle_anchor: 'automatic',
                application_fee_percent: (applicationFeePercent || 0),
                ...(endDate && { end_date: new Date(endDate).getTime() / 1000 }),
                currency: 'usd',
                collection_method: 'charge_automatically',

            }],
            ...rest
        }
        return this._stripe.subscriptionSchedules.create(options);
    }

    async createStripeProduct(data: { name: string, description: string, currency: string, amount: number, billingPeriod: Stripe.PriceCreateParams.Recurring.Interval }): Promise<Stripe.Price> {
        const product = await this._stripe.products.create({
            name: data.name,
            description: data.description
        });
        return await this._stripe.prices.create({
            currency: data.currency,
            recurring: {
                interval: data.billingPeriod
            },
            unit_amount: data.amount,
            product: product.id,
            nickname: data.description
        });
    }

}
async function getStripeCustomer(params: { id: number, mid: number }) {

    const memberLocation = await db.query.memberLocations.findFirst({
        where: (memberLocation, { eq, and }) => and(eq(memberLocation.memberId, params.mid), eq(memberLocation.locationId, params.id))
    })

    if (!memberLocation || !memberLocation.stripeCustomerId) {
        throw new Error("Member location not found")
    }

    const integrations = await db.query.integrations.findFirst({
        where: (integration, { eq }) => eq(integration.locationId, params.id),
        columns: {
            secretKey: true
        }
    })
    if (!integrations?.secretKey) {
        throw new Error("Stripe integration not found")
    }
    const stripe = new MemberStripePayments(integrations.secretKey).setCustomer(memberLocation.stripeCustomerId);
    return stripe
}

export { VendorStripePayments, MemberStripePayments, getStripeCustomer };
