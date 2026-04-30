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
}