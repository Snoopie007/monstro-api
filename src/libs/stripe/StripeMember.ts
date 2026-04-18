import type Stripe from "stripe";
import { StripeBase, type PaymentMethodOptions } from "./StripeBase";
import { BASE_MONSTRO_X_URL } from "@subtrees/emails/_shared/data";



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



export class MemberStripePayments extends StripeBase {
    private _accountId: string | null;
    constructor(accountId: string, secretKey: string) {

        super(secretKey);
        this._accountId = accountId;
    }

    async getPaymentMethod(id: string): Promise<Stripe.PaymentMethod> {
        return await this._stripe.paymentMethods.retrieve(id, { expand: ["customer"] });
    }

    async getCharges(limit?: number) {
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
    }): Promise<Stripe.Refund> {
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const refundContext = await this.resolveRefundContext(params);
        const availableBalance = await this.getConnectedAvailableBalance(refundContext.currency);
        if (availableBalance - refundContext.amount < 0) {
            const error = new Error("Connected Stripe account has insufficient available balance to reverse this transfer.");
            (error as Error & { code?: string }).code = "INSUFFICIENT_CONNECTED_ACCOUNT_BALANCE";
            throw error;
        }

        return this._stripe.refunds.create({
            ...(params.payment_intent && { payment_intent: params.payment_intent }),
            ...(params.charge && { charge: params.charge }),
            ...(typeof params.amount === "number" && params.amount > 0 && { amount: params.amount }),
            refund_application_fee: false,
            reverse_transfer: true,
            reason: "requested_by_customer",
        });
    }

    private async getConnectedAvailableBalance(currency: string): Promise<number> {
        if (!this._accountId) {
            throw new Error("Account ID not set");
        }

        const balance = await this._stripe.balance.retrieve({}, {
            stripeAccount: this._accountId,
        });

        const normalizedCurrency = currency.toLowerCase();
        return balance.available
            .filter((entry) => entry.currency.toLowerCase() === normalizedCurrency)
            .reduce((sum, entry) => sum + entry.amount, 0);
    }

    private async resolveRefundContext(params: {
        payment_intent?: string;
        charge?: string;
        amount?: number;
    }): Promise<{ amount: number; currency: string }> {
        if (typeof params.amount === "number" && params.amount > 0) {
            if (params.charge) {
                const charge = await this._stripe.charges.retrieve(params.charge);
                if ("deleted" in charge && charge.deleted) {
                    throw new Error("Charge not found for refund");
                }
                return { amount: params.amount, currency: charge.currency };
            }

            if (params.payment_intent) {
                const paymentIntent = await this._stripe.paymentIntents.retrieve(params.payment_intent);
                return { amount: params.amount, currency: paymentIntent.currency };
            }

            throw new Error("Either charge or payment_intent is required to determine refund currency");
        }

        if (params.charge) {
            const charge = await this._stripe.charges.retrieve(params.charge);
            if ("deleted" in charge && charge.deleted) {
                throw new Error("Charge not found for refund");
            }
            return { amount: charge.amount, currency: charge.currency };
        }

        if (params.payment_intent) {
            const paymentIntent = await this._stripe.paymentIntents.retrieve(params.payment_intent);
            const amount = paymentIntent.amount_received && paymentIntent.amount_received > 0
                ? paymentIntent.amount_received
                : paymentIntent.amount;
            return { amount, currency: paymentIntent.currency };
        }

        throw new Error("Either charge or payment_intent is required to create a refund");
    }



}
