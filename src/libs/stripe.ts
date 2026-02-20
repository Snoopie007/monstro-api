import type { PaymentType } from "@subtrees/types";

import { addMonths, addYears } from "date-fns";
import Stripe from "stripe";
import { BASE_MONSTRO_X_URL } from "@subtrees/emails/_shared/data";

type Customer = {
    firstName: string;
    lastName: string | null;
    email: string;
    phone: string | null;
    address?: {
        line1: string;
        line2: string;
        city: string;
        state: string;
        postal_code: string;
        country: string;
    };
};

interface VendorPaymentIntentOptions {
    authorizeOnly?: boolean;
    statement?: string;
    description?: string;
    metadata?: Record<string, any>;
}




type MemberPaymentOptions = {
    total: number,
    unitCost: number,
    tax: number,
    applicationFeeAmount: number,
    paymentMethodId: string,
    authorizeOnly?: boolean,
    description?: string,
    productName?: string,
    discount?: number,
    quantity?: number,
    currency?: string,
    metadata?: Record<string, any>;
}




const isProd = process.env.BUN_ENV === "production";
const STRIPE_API_VERSION = "2025-12-15.clover";


abstract class BaseStripePayments {
    protected _stripe: Stripe;
    protected _customer: string | null = null;

    constructor(key: string) {
        this._stripe = new Stripe(key, {
            apiVersion: STRIPE_API_VERSION,
            timeout: 30000,
            maxNetworkRetries: 1,
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
        const { id, client_secret, payment_method } =
            await this._stripe.setupIntents.create(option);

        return {
            id,
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

    async retryPaymentIntent(lid: string, paymentIntentId: string, paymentMethodId: string) {
        const url = `${BASE_MONSTRO_X_URL}/account/location/${lid}/purchase/confirm`;
        return await this._stripe.paymentIntents.confirm(paymentIntentId, {
            payment_method: paymentMethodId,
            return_url: url,
            expand: ["payment_method"],
        });
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

class VendorStripePayments extends BaseStripePayments {
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
                "Stripe-Version": "2026-01-28.preview",
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

        const now = new Date();
        const expiresOn = addYears(now, 1);
        const res = await fetch("https://api.stripe.com/v1/reserve/holds", {
            method: "POST",
            headers: {
                Authorization: `Basic ${Buffer.from(this._secretKey + ":").toString("base64")}`,
                'Stripe-Version': "2026-01-28.preview",
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
    async createPaymentIntent(amount: number, paymentMethodId: string) {
        if (!this._customer) {
            throw new Error("Customer not set");
        }
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const option: Stripe.PaymentIntentCreateParams = {
            payment_method_types: ['card', 'us_bank_account'],
            customer: this._customer,
            payment_method: paymentMethodId,
            confirm: true,
            amount,
            currency: "usd",
            return_url: `${BASE_MONSTRO_X_URL}/stripe/cards/success`,
        }
        return this._stripe.paymentIntents.create(option);
    }
    async processPayment(options: MemberPaymentOptions) {

        if (!this._customer) {
            throw new Error("Customer not set");
        }
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }


        const {

            description, total, unitCost, metadata, discount,
            authorizeOnly, productName, currency,
            tax, paymentMethodId, applicationFeeAmount
        } = options || {};



        const url = `${BASE_MONSTRO_X_URL}/account/location/${metadata?.lid}/purchase/confirm`;
        const option: Stripe.PaymentIntentCreateParams = {
            payment_method_types: ['card', 'us_bank_account'],
            customer: this._customer,
            amount: total,
            currency: currency || "usd",
            amount_details: {
                line_items: [{
                    product_name: productName || "",
                    quantity: 1,
                    unit_cost: unitCost,
                    ...(discount && { discount_amount: discount }),
                    tax: {
                        total_tax_amount: tax,
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
            return_url: url,
            expand: ["payment_method"],
            metadata: metadata || undefined
        }


        const { id, client_secret } = await this._stripe.paymentIntents.create(option);

        return {
            id,
            clientSecret: client_secret,
        };
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



        return this._stripe.checkout.sessions.create(option);
    }


    async createRefund(params: {
        payment_intent?: string;
        charge?: string;
        amount?: number;
        reverseTransfer?: boolean;
        allowNoReverseTransferFallback?: boolean;
    }): Promise<Stripe.Refund> {
        const requestedReverseTransfer = params.reverseTransfer ?? true;
        const buildPayload = (reverseTransfer: boolean): Stripe.RefundCreateParams => ({
            ...(params.payment_intent && { payment_intent: params.payment_intent }),
            ...(params.charge && { charge: params.charge }),
            ...(typeof params.amount === "number" && params.amount > 0 && { amount: params.amount }),
            refund_application_fee: false,
            reverse_transfer: reverseTransfer,
            reason: "requested_by_customer",
        });

        try {
            return await this._stripe.refunds.create(buildPayload(requestedReverseTransfer));
        } catch (error) {
            const canFallback =
                requestedReverseTransfer
                && (params.allowNoReverseTransferFallback ?? true)
                && error instanceof Stripe.errors.StripeInvalidRequestError
                && /reverse_transfer|insufficient funds/i.test(error.message || "");

            if (!canFallback) {
                throw error;
            }

            return await this._stripe.refunds.create(buildPayload(false));
        }
    }



}


export { VendorStripePayments, MemberStripePayments };
