import type { BillingCycleAnchorConfig, MemberPlan, MemberPlanPricing, PaymentType } from "@/types";
import type { AddressParam } from "@stripe/stripe-js";
import { isSameDay, addMonths, isAfter, isBefore } from "date-fns";
import Stripe from "stripe";

type Customer = {
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    address?: AddressParam;
};


interface MemberPaymentOptions {
    amount: number,
    paymentMethodId: string,
    applicationFeeAmount: number,
    authorizeOnly?: boolean,
    taxRateId?: string,
    description?: string,
    productName?: string,
    discount?: number,
    quantity?: number,
    currency?: string,
    tax?: number,
    unitCost?: number,
    metadata?: Record<string, any>;
    returnUrl?: string;
}

type MemberSubscriptionOptions = {
    stripePriceId: string,
    paymentMethodId: string,
    feePercent: number,
    startDate: Date,
    currency?: string,
    backdateStartDate?: Date | null,
    stripeCouponId?: string,
    cancelAt?: Date | null,
    trialEnd?: Date | null,
    taxRateId?: string;
    isAllowProration?: boolean;
    description?: string;
    metadata?: Record<string, any>;
    billingAnchorConfig?: BillingCycleAnchorConfig

}
const isProd = process.env.NODE_ENV === "production";
const STRIPE_API_VERSION = "2025-12-15.clover";


abstract class BaseStripePayments {
    protected _stripe: Stripe;
    protected _customer: string | null = null;

    constructor(key: string) {
        this._stripe = new Stripe(key, {
            apiVersion: STRIPE_API_VERSION,
            appInfo: {
                name: "My Monstro",
                url: "https://monstro-x.com",
            },
        });
    }

    public setCustomer(customer: string) {
        this._customer = customer;
        return this;
    }



    async connectOAuth(code: string, scope?: string) {
        return await this._stripe.oauth.token({
            grant_type: "authorization_code",
            code,
            scope: scope || "read_write",
        });
    }

    public async createCustomer(
        customer: Customer,
        token: string | undefined,
        metadata?: Record<string, any>
    ) {
        const c = await this._stripe.customers.create({
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone || undefined,
            ...(token && { source: token }),
            ...(customer.address && {
                address: {
                    ...customer.address,
                    country: customer.address.country || "US",
                },
            }),
            metadata: metadata || undefined,
        });
        this.setCustomer(c.id);
        return c;
    }

    async constructEventAsync(
        body: Buffer,
        sig: string,
        key: string
    ): Promise<Stripe.Event> {
        return await this._stripe.webhooks.constructEventAsync(body, sig, key);
    }
    async constructEvent(
        body: Buffer,
        sig: string,
        key: string
    ): Promise<Stripe.Event> {
        return await this._stripe.webhooks.constructEvent(body, sig, key);
    }

    async updatePaymentMethod(id: string, update: Stripe.PaymentMethodUpdateParams) {
        return await this._stripe.paymentMethods.update(id, update);
    }

    async createEphemeralKey(accountId?: string) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        return await this._stripe.ephemeralKeys.create(
            { customer: this._customer },
            {
                apiVersion: STRIPE_API_VERSION,
                ...(accountId && { account: accountId }),
            }
        );
    }

    async setupIntentWithToken(customerId: string, token: string) {
        const option: Stripe.SetupIntentCreateParams = {
            automatic_payment_methods: { enabled: true },
            customer: customerId,
            usage: "off_session",
            payment_method: token,
            expand: ["payment_method"]
        };
        return await this._stripe.setupIntents.create(option);
    }

    async confirmSetupIntent(id: string, mandateData: {
        ip: string;
        userAgent: string;
        acceptedAt: number;
    }) {
        return await this._stripe.setupIntents.confirm(id, {
            mandate_data: {
                customer_acceptance: {
                    type: "online",
                    accepted_at: mandateData.acceptedAt,
                    online: {
                        ip_address: mandateData.ip,
                        user_agent: mandateData.userAgent,
                    },
                },
            },
            expand: ["payment_method"],
        });
    }

    async createSetupIntent(paymentMethodTypes?: PaymentType[]) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }

        const types = paymentMethodTypes || ["card", "us_bank_account"];


        const option: Stripe.SetupIntentCreateParams = {
            customer: this._customer,
            payment_method_types: types,
            payment_method_options: {
                us_bank_account: {
                    financial_connections: {
                        permissions: ['payment_method'],
                    },
                },
            },
        };
        return await this._stripe.setupIntents.create(option);
    }

    async getSetupIntent(setupIntentId: string) {
        return await this._stripe.setupIntents.retrieve(setupIntentId, {
            expand: ["payment_method"],
        });
    }

    async getCustomer(customerId: string): Promise<Stripe.Customer | undefined> {

        const customer = await this._stripe.customers.retrieve(customerId);

        if (customer.deleted) {
            return undefined;
        }
        return customer;
    }

    async retrievePaymentMethod(customerId: string, paymentId: string) {
        return await this._stripe.customers.retrievePaymentMethod(
            customerId,
            paymentId
        );
    }

    async getInvoice(invoiceId: string) {
        return await this._stripe.invoices.retrieve(invoiceId);
    }

    async getPaymentIntent(paymentIntentId: string) {
        return await this._stripe.paymentIntents.retrieve(paymentIntentId);
    }

    async getToken(tokenId: string) {
        return await this._stripe.tokens.retrieve(tokenId);
    }

    async updateCustomer(updates: Stripe.CustomerUpdateParams) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        return await this._stripe.customers.update(this._customer, updates);
    }

    async getPaymentMethods(customerId: string, options?: { limit?: number, type?: "card" | "us_bank_account" }) {
        return await this._stripe.customers.listPaymentMethods(customerId, {
            limit: options?.limit || 10,
            ...(options?.type && { type: options.type as Stripe.CustomerListPaymentMethodsParams.Type }),
        });
    }

    async setupIntent(source: string, type?: string) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const option: Record<string, any> = {
            customer: this._customer,
            confirm: true,
            payment_method_data: {
                type: type || "card",
                card: {
                    token: source,
                },
            },
            payment_method_types: type ? [type] : ["card"],
            expand: ["payment_method"],
        };
        const { client_secret, payment_method } =
            await this._stripe.setupIntents.create(option);

        return {
            clientSecret: client_secret as string,
            paymentMethod: payment_method as Stripe.PaymentMethod,
        };
    }

    async getSubscriptions(customerId: string, limit?: number) {
        const list = await this._stripe.subscriptions.list({
            customer: customerId,
            limit: limit || 10,
        });
        return list;
    }

    async getCharges(limit?: number) {
        const res = await this._stripe.charges.list({ limit: limit || 10 });
        return res.data;
    }

    async getInvoices(limit?: number) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const res = await this._stripe.invoices.list({
            customer: this._customer,
            limit: limit || 10,
        });
        return res.data;
    }

    async retryPayment(invoiceId: string, paymentMethod: string) {
        return await this._stripe.invoices.pay(invoiceId, {
            payment_method: paymentMethod,
        });
    }

    async refund(chargeId: string) {
        return await this._stripe.refunds.create({ charge: chargeId });
    }

    async removeAccount(accountId: string) {
        // Validate accountId to prevent empty string causing invalid API calls
        if (!accountId || accountId.trim() === "") {
            throw new Error("Invalid account ID: cannot be empty");
        }
        return await this._stripe.accounts.del(accountId);
    }

    async getSubscription(subscriptionId: string) {
        return await this._stripe.subscriptions.retrieve(subscriptionId, {
            expand: [
                "latest_invoice",
                "latest_invoice.payments",
                "latest_invoice.payment_intent",
            ],
        });
    }

    async calculateTax(amount: number, quantity: number, reference: string) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const res = await this._stripe.tax.calculations.create({
            currency: "usd",
            customer: this._customer,
            line_items: [
                {
                    amount,
                    quantity,
                    reference,
                },
            ],
        });
        return res;
    }


    async attachPaymentMethod(paymentMethodId: string) {
        if (!this._customer) {
            throw new Error("Customer ID is required");
        }
        return await this._stripe.paymentMethods.attach(paymentMethodId,
            { customer: this._customer }
        );
    }

    /**
     * Detach a payment method from a customer
     */
    async detachPaymentMethod(paymentMethodId: string) {
        return await this._stripe.paymentMethods.detach(
            paymentMethodId
        );
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
    constructor(secretKey?: string) {
        super(secretKey || process.env.STRIPE_SECRET_KEY!);
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
    ): Promise<VendorPaymentIntentResponse> {
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
            return_url: "https://www.monstro-x.com",
        };

        if (cardId) {
            option.payment_method = cardId;
        }

        const paymentIntent = await this._stripe.paymentIntents.create(option);
        return {
            clientSecret: paymentIntent.client_secret as string,
            paymentIntent: paymentIntent as Stripe.PaymentIntent,
        };
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



class MemberStripePayments extends BaseStripePayments {
    private _accountId: string | null;
    constructor(accountId?: string, secretKey?: string) {
        super(secretKey || process.env.STRIPE_SECRET_KEY!);
        this._accountId = accountId || null;
    }

    async getPaymentMethod(id: string): Promise<Stripe.PaymentMethod> {
        return await this._stripe.paymentMethods.retrieve(id, { expand: ["customer"] });
    }


    override async getCharges(limit?: number) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        const res = await this._stripe.charges.list({
            limit: limit || 10,
            customer: this._customer,
        });
        return res.data;
    }

    async createPaymentIntent(options: MemberPaymentOptions) {

        if (!this._customer) {
            throw new Error("Customer not set");
        }
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const { description, unitCost, tax, metadata, discount,
            returnUrl, authorizeOnly, productName, currency,
            amount, applicationFeeAmount, paymentMethodId
        } = options || {};

        const option: Stripe.PaymentIntentCreateParams = {
            payment_method_types: ['card', 'us_bank_account'],
            customer: this._customer,
            amount,
            currency: currency || "usd",
            amount_details: {
                line_items: [{
                    product_name: productName || "",
                    quantity: 1,
                    unit_cost: unitCost || 0,
                    ...(discount && { discount_amount: discount }),
                    tax: {
                        total_tax_amount: tax || 0,
                    },
                }],
            },
            description: description,
            transfer_data: {
                destination: this._accountId,
            },
            confirm: true,
            application_fee_amount: applicationFeeAmount,
            payment_method: paymentMethodId || undefined,
            capture_method: authorizeOnly ? "manual" : "automatic",
            return_url: returnUrl || "https://unknown.com",
            expand: ["payment_method"],
            metadata: metadata || undefined
        }

        const { client_secret, payment_method, latest_charge } = await this._stripe.paymentIntents.create(option);
        return { clientSecret: client_secret as string, paymentMethod: payment_method as Stripe.PaymentMethod, chargeId: latest_charge };
    }


    async createCheckoutSession() {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }



        const option: Stripe.Checkout.SessionCreateParams = {
            customer: this._customer,
            payment_method_types: ['card', 'us_bank_account'],


            mode: 'subscription',
        }

        const subscriptionData: Stripe.Checkout.SessionCreateParams.SubscriptionData = {
            transfer_data: {
                destination: this._accountId,
            },
            invoice_settings: {
                issuer: {
                    type: "account" as const,
                    account: this._accountId
                }
            },
            on_behalf_of: this._accountId,

        }


        return this._stripe.checkout.sessions.create(option);
    }

    async createSubscription(options: MemberSubscriptionOptions) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }
        const {
            stripePriceId,
            paymentMethodId,
            feePercent,
            startDate,
            trialEnd,
            stripeCouponId,
            cancelAt,
            taxRateId,
            isAllowProration,
            description,
            currency,
            billingAnchorConfig,
            backdateStartDate,
        } = options;



        const option: Stripe.SubscriptionCreateParams = {
            customer: this._customer,
            transfer_data: {
                destination: this._accountId,
            },
            on_behalf_of: this._accountId,
            automatic_tax: {
                enabled: taxRateId ? true : false,
                ...(taxRateId && {
                    liability: {
                        type: "account",
                    }
                }),
            },
            currency: currency || "usd",
            invoice_settings: {
                issuer: {
                    type: "account" as const,
                    account: this._accountId
                }
            },
            description,
            items: [{ price: stripePriceId, ...(stripeCouponId && { discounts: [{ coupon: stripeCouponId }] }) }],
            collection_method: "charge_automatically",
            default_payment_method: paymentMethodId || undefined,
            application_fee_percent: feePercent || 0,
            cancel_at: cancelAt ? cancelAt.getTime() / 1000 : undefined,
            trial_end: trialEnd ? trialEnd.getTime() / 1000 : undefined,
        };

        if (taxRateId) {
            option.default_tax_rates = [taxRateId];
        }

        if (billingAnchorConfig && Object.keys(billingAnchorConfig).length > 0) {
            option.billing_cycle_anchor_config = billingAnchorConfig;
        }

        if (startDate && isAfter(startDate, new Date())) {
            option.proration_behavior = isAllowProration ? "create_prorations" : "none";
            option.billing_cycle_anchor = Math.floor(startDate.getTime() / 1000);
        }
        if (backdateStartDate) {
            option.backdate_start_date = Math.floor(backdateStartDate.getTime() / 1000);
        }

        return this._stripe.subscriptions.create(option);
    }



    async createStripeProduct(
        data: MemberPlanPricing,
        metadata: Record<string, any>
    ): Promise<Stripe.Price> {
        const { interval, price, intervalThreshold } = data;
        const product = await this._stripe.products.create({
            name: data.name,
            description: metadata.description,
            active: true,
            default_price_data: {
                currency: "usd",
                recurring: {
                    interval: interval as Stripe.PriceCreateParams.Recurring.Interval,
                    interval_count: intervalThreshold || 1,
                },
                unit_amount: price,
                metadata,
            },
            metadata,
            expand: ["default_price"],
        });

        return product.default_price as Stripe.Price;
    }


    async createTaxRate(data: Stripe.TaxRateCreateParams) {
        return await this._stripe.taxRates.create(data);
    }

    async updateTaxRate(taxRateId: string, data: Stripe.TaxRateUpdateParams) {
        return await this._stripe.taxRates.update(taxRateId, data);
    }

    async getTaxRates() {
        return await this._stripe.taxRates.list({
            limit: 10,
        });
    }


    async updateSubscription(
        sid: string,
        updates: Partial<Stripe.SubscriptionUpdateParams>
    ): Promise<Stripe.Subscription> {
        const commonPhaseOptions: Stripe.SubscriptionUpdateParams = {
            ...updates,
        };

        return this._stripe.subscriptions.update(sid, commonPhaseOptions);
    }

    async cancelSubscription(
        subscriptionId: string,
        endOfPeriod: boolean,
        cancelDate?: Date
    ) {
        const today = new Date();
        if (cancelDate && isSameDay(cancelDate, today)) {
            return this._stripe.subscriptions.cancel(subscriptionId);
        } else {
            return this._stripe.subscriptions.update(subscriptionId, {
                cancel_at_period_end: endOfPeriod,
                ...(!endOfPeriod && {
                    cancel_at: cancelDate ? cancelDate.getTime() / 1000 : undefined,
                }),
            });
        }
    }

    async createRefund(params: {
        payment_intent?: string;
        charge?: string;
    }): Promise<Stripe.Refund> {
        return this._stripe.refunds.create({
            ...(params.payment_intent && { payment_intent: params.payment_intent }),
            ...(params.charge && { charge: params.charge }),
            refund_application_fee: false,
            reverse_transfer: true,
            reason: "requested_by_customer",
        });
    }

    // Enhanced invoice creation methods for one-off invoices
    async createInvoiceItem(
        customerId: string,
        itemData: {
            amount: number;
            currency: string;
            description: string;
            metadata?: Record<string, any>;
        }
    ): Promise<Stripe.InvoiceItem> {
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        return await this._stripe.invoiceItems.create({
            customer: customerId,
            amount: itemData.amount,
            currency: itemData.currency,
            description: itemData.description,
            metadata: itemData.metadata || {},
        });
    }

    async createDraftInvoice(
        customerId: string,
        options: {
            collection_method: "charge_automatically" | "send_invoice";
            description?: string;
            due_date?: number;
            metadata?: Record<string, any>;
            auto_advance?: boolean;
            pending_invoice_items_behavior?: "include" | "exclude";
        }
    ): Promise<Stripe.Invoice> {
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const accountDestination = {
            type: "account" as const,
            account: this._accountId,
        };

        return await this._stripe.invoices.create({
            customer: customerId,
            collection_method: options.collection_method,
            description: options.description,
            due_date: options.due_date,
            metadata: options.metadata || {},
            auto_advance: options.auto_advance || false,
            on_behalf_of: this._accountId,
            issuer: accountDestination,
            transfer_data: {
                destination: this._accountId,
            },
            pending_invoice_items_behavior:
                options.pending_invoice_items_behavior || "include",
        });
    }

    async previewInvoice(
        customerId: string,
        invoiceItems?: any[]
    ): Promise<Stripe.Invoice> {
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const params: any = {};

        // If invoice items are provided, create an isolated preview with only those items
        if (invoiceItems && invoiceItems.length > 0) {
            params.invoice_items = invoiceItems;
            // Don't include customer to avoid pulling in subscriptions and pending items
        } else {
            // Fallback to customer-based preview if no specific items
            params.customer = customerId;
        }

        return await this._stripe.invoices.createPreview(params);
    }

    async finalizeInvoice(invoiceId: string): Promise<Stripe.Invoice> {
        return await this._stripe.invoices.finalizeInvoice(invoiceId);
    }

    async sendInvoice(invoiceId: string): Promise<Stripe.Invoice> {
        return await this._stripe.invoices.sendInvoice(invoiceId);
    }

    async deleteInvoiceItem(
        invoiceItemId: string
    ): Promise<Stripe.DeletedInvoiceItem> {
        return await this._stripe.invoiceItems.del(invoiceItemId);
    }

    // Create recurring invoice using subscription schedules with custom items
    async createRecurringInvoiceSchedule(
        customerId: string,
        items: Array<{
            price_data: {
                currency: string;
                product_data: {
                    name: string;
                    description?: string;
                };
                unit_amount: number;
                recurring: {
                    interval: "month" | "year" | "week" | "day";
                    interval_count?: number;
                };
            };
            quantity: number;
        }>,
        startDate: Date,
        endDate?: Date
    ): Promise<Stripe.SubscriptionSchedule> {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const accountDestination = {
            type: "account" as const,
            account: this._accountId,
        };

        // Create prices for each item first, then use them in the schedule
        const scheduleItems: Array<{ price: string; quantity: number }> = [];
        for (const item of items) {
            // Create product for this item
            const productData: any = {
                name: item.price_data.product_data.name,
            };

            // Only include description if it's not empty
            if (
                item.price_data.product_data.description &&
                item.price_data.product_data.description.trim() !== ""
            ) {
                productData.description = item.price_data.product_data.description;
            }

            const product = await this._stripe.products.create(productData);

            // Create the price
            const price = await this._stripe.prices.create({
                currency: item.price_data.currency,
                product: product.id,
                unit_amount: item.price_data.unit_amount,
                recurring: {
                    interval: item.price_data.recurring.interval,
                    interval_count: item.price_data.recurring.interval_count || 1,
                },
            });

            scheduleItems.push({
                price: price.id,
                quantity: item.quantity,
            });
        }

        const options: Stripe.SubscriptionScheduleCreateParams = {
            customer: customerId,
            start_date: Math.floor(startDate.getTime() / 1000),
            end_behavior: "cancel",
            phases: [
                {
                    items: scheduleItems,
                    transfer_data: {
                        destination: this._accountId,
                    },
                    invoice_settings: { issuer: accountDestination },
                    billing_cycle_anchor: "automatic",
                    collection_method: "charge_automatically",
                    ...(endDate && { end_date: Math.floor(endDate.getTime() / 1000) }),
                },
            ],
        };

        return await this._stripe.subscriptionSchedules.create(options);
    }

    // Release a subscription schedule to activate it
    async releaseSubscriptionSchedule(
        scheduleId: string
    ): Promise<Stripe.SubscriptionSchedule> {
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        return await this._stripe.subscriptionSchedules.release(scheduleId);
    }
}


export { VendorStripePayments, MemberStripePayments };
