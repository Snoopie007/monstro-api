import { db } from "@/db/db";
import { MemberPlan } from "@/types";
import { MonstroPlan, PackagePaymentPlan } from "@/types/admin";
import { isAfter, addDays, addWeeks } from "date-fns";
import Stripe from "stripe";

type Customer = {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
}

const isProd = process.env.NODE_ENV === "production"

abstract class BaseStripePayments {
    protected _stripe: Stripe;
    protected _customer: string | null = null;


    constructor(key: string) {
        this._stripe = new Stripe(key, {
            apiVersion: "2025-02-24.acacia",
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

    public async createCustomer(customer: Customer, token: string | undefined, metadata?: Record<string, any>) {
        const c = await this._stripe.customers.create({
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone,
            ...(token && { source: token }),
            metadata: metadata || undefined
        });
        this.setCustomer(c.id)
        return c
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

    async updateCustomer(updates: Stripe.CustomerUpdateParams) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        return await this._stripe.customers.update(this._customer, updates);
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

    async getCharges(limit?: number) {
        const res = await this._stripe.charges.list({ limit: limit || 10 });
        return res.data;
    }

    async getInvoices(limit?: number) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const res = await this._stripe.invoices.list({ customer: this._customer, limit: limit || 10 });
        return res.data;
    }

    async retryPayment(invoiceId: string, paymentMethod: string) {
        return await this._stripe.invoices.pay(invoiceId, { payment_method: paymentMethod });
    }

    async refund(chargeId: string) {
        return await this._stripe.refunds.create({ charge: chargeId });
    }
}

interface VendorPaymentIntentOptions {
    authorizeOnly?: boolean;
    statement?: string;
    description?: string;
    metadata?: Record<string, any>;
}

interface VendorPaymentIntentResponse {
    clientSecret: string;
    paymentIntent: Stripe.PaymentIntent;
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

    /**
     * Create a payment intent
     * @param amount - The amount to charge
     * @param cardId - The card id to charge
     * @param options - The options for the payment intent
     * @returns The client secret for the payment intent
     */
    async createPaymentIntent(amount: number, cardId: string | undefined, options?: VendorPaymentIntentOptions): Promise<VendorPaymentIntentResponse> {
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
            ...(cardId && { payment_method: cardId }),
            metadata: options?.metadata || undefined,
            return_url: "https://mymonstro.com",
        };

        const paymentIntent = await this._stripe.paymentIntents.create(option);
        return { clientSecret: paymentIntent.client_secret as string, paymentIntent: paymentIntent as Stripe.PaymentIntent };
    }

    async createSubscription(plan: MonstroPlan, metadata: Record<string, any>, trial?: number) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }

        const options: Stripe.SubscriptionCreateParams = {
            customer: this._customer,
            description: `Monstro ${plan.name} Subscription`,
            items: [{ price: plan.priceId! }],
            metadata
        };
        if (trial) {
            options.trial_period_days = trial;
        }
        return this._stripe.subscriptions.create(options);
    }

    async createPaymentPlan(plan: PackagePaymentPlan, metadata: Record<string, any>) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const today = new Date();
        const startDate = addDays(today, plan.trial || 0);
        const endDate = addWeeks(startDate, (plan.length * 4));

        const options: Stripe.SubscriptionCreateParams = {
            customer: this._customer,
            items: [{ price: isProd ? plan.priceId! : plan.testPriceId! }],
            cancel_at: Math.floor(endDate.getTime() / 1000),
            metadata
        };

        if (plan.trial) {
            options.trial_end = Math.floor(startDate.getTime() / 1000);
        }

        return this._stripe.subscriptions.create(options);
    }

    async createPackageSubscriptions(metadata: Record<string, any>) {

        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const phaseOneCoupon = isProd ? "qHgZNW46" : "QuJSpLOZ"
        const phaseOnePrice = isProd ? "price_1R9XXWDePDUzIffAbDo18Rtf" : "price_1R4UUNDePDUzIffArAlN6mq6"
        const phaseTwoPrice = isProd ? "price_1R4WeVDePDUzIffAZQPObJhE" : "price_1R4SG5DePDUzIffAz3GU05uZ"

        const options: Stripe.SubscriptionScheduleCreateParams = {
            customer: this._customer,
            start_date: "now",
            end_behavior: "release",
            phases: [{
                items: [{ price: phaseOnePrice, discounts: [{ coupon: phaseOneCoupon }] }],
                iterations: 12,
                billing_cycle_anchor: 'automatic',
                currency: 'usd',
                collection_method: 'charge_automatically',
                metadata
            }, {
                items: [{ price: phaseTwoPrice }],
                billing_cycle_anchor: 'automatic',
                currency: 'usd',
                collection_method: 'charge_automatically',
                metadata
            }],
            metadata,
            expand: ["subscription"]
        }
        const schedule = await this._stripe.subscriptionSchedules.create(options);

        return schedule;
    }

    async updateSchedule(scheduleId: string, updates: Stripe.SubscriptionScheduleUpdateParams) {
        return await this._stripe.subscriptionSchedules.update(scheduleId, updates);
    }

    async createGHLSubscription(metadata: Record<string, any>) {
        const price = isProd ? "price_1R4WblDePDUzIffAvMQrZRFE" : "price_1R4S9xDePDUzIffAFUKu0ROH"
        const coupon = isProd ? "kQcIf0sW" : "7Yt7dfGs"
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const options: Stripe.SubscriptionCreateParams = {
            customer: this._customer,
            description: `Monstro Marketing Suite Subscription`,
            items: [{ price, discounts: [{ coupon }] }],
            metadata
        };
        return this._stripe.subscriptions.create(options);
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
    cancelAt: Date | null | undefined,
    trialEnd: Date | null | undefined,
    allowProration?: boolean
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
        return { clientSecret: client_secret as string, paymentMethod: payment_method as Stripe.PaymentMethod };
    }

    async createSubscription(plan: MemberPlan, startDate: Date | undefined, settings: MemberSubscriptionSettings) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const { trialEnd, paymentMethod, applicationFeePercent, allowProration, cancelAt, ...rest } = settings;

        if (!plan.stripePriceId) {
            throw new Error("Price not found");
        }
        const isAllowProration = plan.interval === "month" || plan.interval === "year"
        const options: Stripe.SubscriptionCreateParams = {
            ...rest,
            customer: this._customer,
            description: `Subscription to ${plan.name}`,
            items: [{ price: plan.stripePriceId as string }],
            collection_method: "charge_automatically",
            application_fee_percent: (applicationFeePercent || 0),
            default_payment_method: paymentMethod || undefined,
            cancel_at: cancelAt ? cancelAt.getTime() / 1000 : undefined,
            trial_end: trialEnd ? trialEnd.getTime() / 1000 : undefined,
        };

        if (isAllowProration) {
            if (plan.billingAnchorConfig) {
                options.billing_cycle_anchor_config = plan.billingAnchorConfig;
            }
            if (startDate && isAfter(startDate, new Date())) {
                options.proration_behavior = (allowProration || plan.allowProration) ? "create_prorations" : "none";
                options.billing_cycle_anchor = startDate.getTime() / 1000;
            }
        }

        return this._stripe.subscriptions.create(options);
    }
    createSubSchedule(priceId: string, startDate: Date, settings: MemberSubscriptionSettings): Promise<Stripe.SubscriptionSchedule> {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const { cancelAt, trialEnd, paymentMethod, applicationFeePercent, ...rest } = settings;

        const options: Stripe.SubscriptionScheduleCreateParams = {
            customer: this._customer,
            start_date: new Date(startDate).getTime() / 1000,
            end_behavior: "release",

            phases: [{
                items: [{ price: priceId }],
                billing_cycle_anchor: 'automatic',
                application_fee_percent: (applicationFeePercent || 0),
                ...(cancelAt && { end_date: new Date(cancelAt).getTime() / 1000 }),
                currency: 'usd',
                collection_method: 'charge_automatically',

            }],
            ...rest
        }
        return this._stripe.subscriptionSchedules.create(options);
    }

    async createStripeProduct(data: MemberPlan, locationId: string): Promise<Stripe.Price> {
        const { interval, price, intervalThreshold } = data
        const product = await this._stripe.products.create({
            name: data.name,
            description: data.description,
            active: true,
            default_price_data: {

                currency: data.currency || "usd",
                recurring: {
                    interval: interval as Stripe.PriceCreateParams.Recurring.Interval,
                    interval_count: intervalThreshold || 1
                },
                unit_amount: price,
                metadata: {
                    locationId: locationId,
                    programId: data.programId
                }
            },
            metadata: {
                locationId: locationId,
            },
            expand: ["default_price"]
        });


        return product.default_price as Stripe.Price
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
