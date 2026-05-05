import Stripe from "stripe";
import type { PaymentType } from "@subtrees/types";

const BASE_MONSTRO_X_URL = 'https://m.monstro-x.com';
export const STRIPE_API_VERSION = "2026-03-25.dahlia";


export type PaymentMethodOptions = {
    limit?: number;
    type?: "card" | "us_bank_account";
};

export type StripeCustomer = {
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
export abstract class StripeBase {
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
        customer: StripeCustomer,
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
        body: string,
        sig: string,
        key: string
    ): Promise<Stripe.Event> {
        return await this._stripe.webhooks.constructEvent(body, sig, key);
    }

    async updatePaymentMethod(id: string, update: Stripe.PaymentMethodUpdateParams) {
        return await this._stripe.paymentMethods.update(id, update);
    }

    async getPaymentMethods(customerId: string, options?: PaymentMethodOptions) {

        const res = await this._stripe.customers.listPaymentMethods(
            customerId,
            {
                limit: options?.limit || 10,
                ...(options?.type && { type: options.type as Stripe.CustomerListPaymentMethodsParams.Type }),
            });
        return res.data;
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