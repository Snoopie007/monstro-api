import Stripe from "stripe";
import type { ChargeOptions, Customer } from "./PaymentGateway";
import type { PaymentType } from "@subtrees/types";

const BASE_MONSTRO_X_URL = 'https://m.monstro-x.com';
const isProd = process.env.BUN_ENV === "production";
const STRIPE_API_VERSION = '2026-03-25.dahlia';


export type PaymentMethodOptions = {
    limit?: number;
    type?: "card" | "us_bank_account";
};


export type StripeChargeOptions = ChargeOptions & {
    unitCost: number,
    tax: number,

    description?: string,
    productName?: string,
    quantity?: number,

    discount?: number,
    authorizeOnly?: boolean;
    metadata?: Record<string, any>;
};

export class StripePaymentGateway {

    private _client: Stripe;
    constructor(key: string) {
        this._client = new Stripe(key, {
            apiVersion: STRIPE_API_VERSION,
            timeout: 30000,
            maxNetworkRetries: 1,
            appInfo: {
                name: "Monstro X",
                url: "https://monstro-x.com",
            },
        });
    }



    public async createCustomer(
        customer: Customer,
        source: string | undefined,
        metadata?: Record<string, any>
    ) {
        const c = await this._client.customers.create({
            name: `${customer.firstName} ${customer.lastName}`,
            email: customer.email,
            phone: customer.phone || undefined,
            ...(source && { source }),
            ...(customer.address && {
                address: {
                    ...customer.address,
                    country: customer.address.country || "US",
                },
            }),
            metadata: metadata || undefined,
        });
        return c;
    }

    async createEphemeralKey(customerId: string, accountId?: string) {
        return await this._client.ephemeralKeys.create(
            { customer: customerId },
            {
                apiVersion: STRIPE_API_VERSION,
                ...(accountId && { account: accountId }),
            }
        );
    }

    async createSetupIntent(customerId: string, paymentMethodTypes?: PaymentType[]) {


        const types = paymentMethodTypes || ["card", "us_bank_account"];


        const option: Stripe.SetupIntentCreateParams = {
            customer: customerId,
            payment_method_types: types,
            payment_method_options: {
                us_bank_account: {
                    financial_connections: {
                        permissions: ['payment_method'],
                    },
                },
            },
        };
        return await this._client.setupIntents.create(option);
    }
    async createPaymentIntent(customerId: string, amount: number, paymentMethodId: string) {


        const option: Stripe.PaymentIntentCreateParams = {
            payment_method_types: ['card', 'us_bank_account'],
            customer: customerId,
            payment_method: paymentMethodId,
            confirm: true,
            amount,
            currency: "usd",
            return_url: `${BASE_MONSTRO_X_URL}/stripe/cards/success`,
        }
        return this._client.paymentIntents.create(option);
    }
    public async paymentMethodList(customerId: string) {

        const res = await this._client.customers.listPaymentMethods(customerId, {
            limit: 10,
        });
        return res.data;
    }


    async getPaymentMethods(customerId: string, options?: PaymentMethodOptions) {

        const res = await this._client.customers.listPaymentMethods(
            customerId,
            {
                limit: options?.limit || 10,
                ...(options?.type && { type: options.type as Stripe.CustomerListPaymentMethodsParams.Type }),
            });
        return res.data;
    }

    async getSetupIntent(setupIntentId: string) {
        return await this._client.setupIntents.retrieve(setupIntentId, {
            expand: ["payment_method"],
        });
    }

    async retrievePaymentMethod(customerId: string, paymentMethodId: string) {
        const paymentMethod = await this._client.paymentMethods.retrieve(paymentMethodId);
        const owner = typeof paymentMethod.customer === "string"
            ? paymentMethod.customer
            : paymentMethod.customer?.id;

        if (owner !== customerId) {
            const error = new Error("Payment method does not belong to customer");
            (error as Error & { code?: string; statusCode?: number }).code = "resource_missing";
            (error as Error & { code?: string; statusCode?: number }).statusCode = 404;
            throw error;
        }

        return paymentMethod;
    }

    async getCustomer(customerId: string) {
        const customer = await this._client.customers.retrieve(customerId, {
            expand: ["invoice_settings.default_payment_method"],
        });

        return customer.deleted ? null : customer;
    }

    async createCharge(customerId: string, paymentMethodId: string, options: StripeChargeOptions) {


        const {
            description,
            total,
            unitCost,
            metadata,
            discount,
            authorizeOnly,
            productName,
            currency,
            tax,
            feesAmount
        } = options || {};



        const url = `${BASE_MONSTRO_X_URL}/account/location/${metadata?.lid}/purchase/confirm`;
        const option: Stripe.PaymentIntentCreateParams = {
            payment_method_types: ['card', 'us_bank_account'],
            customer: customerId,
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
            confirm: true,
            application_fee_amount: feesAmount,
            payment_method: paymentMethodId || undefined,
            capture_method: authorizeOnly ? "manual" : "automatic",
            return_url: url,
            expand: ["payment_method"],
            metadata: metadata || undefined
        }

        try {
            const { id, client_secret } = await this._client.paymentIntents.create(option);

            return {
                id,
                clientSecret: client_secret,
            };
        } catch (error) {
            if (error instanceof Stripe.errors.StripeCardError) {
                throw error;
            }
            throw new Error("Failed to charge payment");
        }
    }

    async createRefund(paymentIntentId: string, amount: number, currency: string) {
        // Check connected account available balance before attempting refund
        const balance = await this._client.balance.retrieve();
        const available = balance.available
            .filter((e) => e.currency.toLowerCase() === currency.toLowerCase())
            .reduce((sum, e) => sum + e.amount, 0);

        if (available - amount < 0) {
            const error = new Error(
                "Connected Stripe account has insufficient available balance to reverse this transfer."
            );
            (error as Error & { code?: string }).code = "INSUFFICIENT_CONNECTED_ACCOUNT_BALANCE";
            throw error;
        }

        return this._client.refunds.create({
            payment_intent: paymentIntentId,
            amount: amount > 0 ? amount : undefined,
            refund_application_fee: false,
            reverse_transfer: true,
            reason: "requested_by_customer",
        });
    }
}
