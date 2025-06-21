import { db } from "@/db/db";
import { MemberPlan } from "@/types";
import { MonstroPlan, PackagePaymentPlan } from "@/types/admin";
import { AddressParam } from "@stripe/stripe-js";
import { isAfter, addDays, addWeeks } from "date-fns";
import Stripe from "stripe";

type Customer = {
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    address?: AddressParam;
}

const isProd = process.env.NODE_ENV === "production"
const STRIPE_FEE_PERCENT = 2.9
const STRIPE_FEE_AMOUNT = 0.30



function calculatePercentage(amount: number) {
    const additionalPercentage = Number(((STRIPE_FEE_AMOUNT / (amount / 100)) * 100).toFixed(2))
    return additionalPercentage + STRIPE_FEE_PERCENT
}

abstract class BaseStripePayments {
    protected _stripe: Stripe;
    protected _customer: string | null = null;


    constructor(key: string) {
        this._stripe = new Stripe(key, {
            apiVersion: "2025-05-28.basil",
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
    async connectOAuth(code: string, scope?: string) {
        return await this._stripe.oauth.token({
            grant_type: "authorization_code",
            code,
            scope: scope || "read_write"
        });
    }

    public async createCustomer(customer: Customer, token: string | undefined, metadata?: Record<string, any>) {
        const c = await this._stripe.customers.create({
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone || undefined,
            ...(token && { source: token }),
            ...(customer.address && {
                address: {
                    ...customer.address,
                    country: customer.address.country || "US"
                }
            }),
            metadata: metadata || undefined,
        });
        this.setCustomer(c.id)
        return c
    }

    async constructEvent(body: Buffer, sig: string, key: string): Promise<Stripe.Event> {
        return await this._stripe.webhooks.constructEvent(body, sig, key);
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

    async removeAccount(accountId: string) {

        return await this._stripe.accounts.del(accountId);
    }

    async calculateTax(amount: number, quantity: number, reference: string) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const res = await this._stripe.tax.calculations.create({
            currency: "usd",
            customer: this._customer,
            line_items: [{
                amount,
                quantity,
                reference
            }]
        });
        return res;
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
            metadata: options?.metadata || undefined,
            return_url: "https://mymonstro.com",
        };

        if (cardId) {
            option.payment_method = cardId;
        }

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

    async createPaymentPlan(
        plan: PackagePaymentPlan,
        coupon: string | undefined,
        metadata: Record<string, any>,
        paymentMethodId?: string | undefined
    ) {

        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const today = new Date();
        const startDate = addDays(today, plan.trial || 0);
        const endDate = addWeeks(startDate, (plan.length * 4));

        const options: Stripe.SubscriptionCreateParams = {
            customer: this._customer,
            items: [{
                price: isProd ? plan.priceId! : plan.testPriceId!
            }],
            cancel_at: Math.floor(endDate.getTime() / 1000),
            metadata
        };

        if (paymentMethodId) {
            options.default_payment_method = paymentMethodId;
        }


        if (coupon) {
            options.discounts = [{ coupon }];
        }

        if (plan.trial) {
            options.trial_end = Math.floor(startDate.getTime() / 1000);
        }

        return this._stripe.subscriptions.create(options);
    }

    async createPackageSubscriptions(metadata: Record<string, any>, paymentMethodId?: string | undefined) {

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
                ...(paymentMethodId && { default_payment_method: paymentMethodId }),
                collection_method: 'charge_automatically',
                metadata
            }, {
                items: [{ price: phaseTwoPrice }],
                billing_cycle_anchor: 'automatic',
                currency: 'usd',
                ...(paymentMethodId && { default_payment_method: paymentMethodId }),
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
    private _accountId: string | null;
    constructor(accountId?: string, secretKey?: string) {
        super(secretKey || process.env.STRIPE_MEMBER_SECRET_KEY!);
        this._accountId = accountId || null;
    }


    async createPaymentIntent(amount: number, settings?: PaymentIntentSettings) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const percentage = calculatePercentage(amount) + (settings?.applicationFeePercent || 0)
        const applicationFeeAmount = Math.floor((amount / 100) * (percentage / 100));

        const option: Stripe.PaymentIntentCreateParams = {
            amount,
            description: settings?.description,
            transfer_data: {
                destination: this._accountId,
            },
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
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }
        const { trialEnd, paymentMethod, applicationFeePercent, allowProration, cancelAt, ...rest } = settings;

        if (!plan.stripePriceId) {
            throw new Error("Price not found");
        }
        const isAllowProration = plan.interval === "month" || plan.interval === "year"
        const taxSettings = await this.retrieveTaxSettings()
        const stripePercentage = calculatePercentage(plan.price)

        const automaticTax = taxSettings.status === 'active';

        const accountDestination = {
            type: "account" as const,
            account: this._accountId
        }
        const options: Stripe.SubscriptionCreateParams = {
            ...rest,
            customer: this._customer,
            transfer_data: {
                destination: this._accountId,
            },
            automatic_tax: { enabled: automaticTax, liability: accountDestination },
            invoice_settings: { issuer: accountDestination },
            description: `Subscription to ${plan.name}`,
            items: [{ price: plan.stripePriceId as string }],
            collection_method: "charge_automatically",
            default_payment_method: paymentMethod || undefined,
            application_fee_percent: stripePercentage + (applicationFeePercent || 0),
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
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }
        const { cancelAt, trialEnd, paymentMethod, applicationFeePercent, ...rest } = settings;

        const accountDestination = {
            type: "account" as const,
            account: this._accountId
        }
        const options: Stripe.SubscriptionScheduleCreateParams = {
            customer: this._customer,
            start_date: new Date(startDate).getTime() / 1000,
            end_behavior: "release",

            phases: [{
                items: [{ price: priceId }],
                transfer_data: {
                    destination: this._accountId,
                },

                invoice_settings: { issuer: accountDestination },
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

    async createStripeProduct(data: MemberPlan, metadata: Record<string, any>): Promise<Stripe.Price> {
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
                metadata
            },
            metadata,
            expand: ["default_price"]
        });


        return product.default_price as Stripe.Price
    }

    async retrieveTaxSettings() {
        const res = await this._stripe.tax.settings.retrieve();
        return res;
    }

    async updateTaxSettings(settings: Stripe.Tax.SettingsUpdateParams) {
        return await this._stripe.tax.settings.update(settings);
    }

    async getTaxRegistrations() {
        const res = await this._stripe.tax.registrations.list();
        return res.data;
    }

    async updateTaxRegistration(registrationId: string, updates: Stripe.Tax.RegistrationUpdateParams) {
        return await this._stripe.tax.registrations.update(registrationId, updates);
    }

    async createTaxRegistration(type: Stripe.Tax.RegistrationCreateParams.CountryOptions.Us.Type, state: string, country: string) {
        return await this._stripe.tax.registrations.create({
            country: country,
            country_options: {
                us: {
                    state,
                    type
                }
            },
            active_from: 'now'
        });
    }
}


async function getStripeCustomer(params: { id: number, mid: number }) {

    const member = await db.query.members.findFirst({
        where: (member, { eq }) => eq(member.id, params.mid)
    })

    if (!member || !member.stripeCustomerId) {
        throw new Error("Member not found")
    }

    const stripe = new MemberStripePayments().setCustomer(member.stripeCustomerId);
    return stripe
}

export { VendorStripePayments, MemberStripePayments, getStripeCustomer };
