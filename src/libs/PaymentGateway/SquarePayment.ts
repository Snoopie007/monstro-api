import type { ChargeOptions, Customer } from "./PaymentGateway";
import { SquareClient, type Address, SquareEnvironment, SquareError, Currency } from "square";
const isProd = process.env.BUN_ENV === "production";
const SQUARE_API_VERSION = '2026-01-22';

export interface SquareChargeError extends Error {
    code: string;
    category: string;
    message: string;
    details: typeof SquareError;
}


export type SquareChargeOptions = ChargeOptions & {
    squareLocationId: string;
    referenceId: string;
    note?: string;
};

export class SquarePaymentGateway {
    private _client: SquareClient;
    private _customerId: string | undefined = undefined;
    constructor(accessToken: string) {
        this._client = new SquareClient({

            environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
            token: accessToken,
            version: SQUARE_API_VERSION,
        });
    }

    private generateIdempotencyKey() {
        return crypto.randomUUID();
    }

    public async createCustomer(customer: Customer, metadata?: Record<string, any>) {

        const c = await this._client.customers.create({
            givenName: customer.firstName,
            familyName: customer.lastName || "",
            emailAddress: customer.email,
            phoneNumber: customer.phone || undefined,
            address: {
                addressLine1: customer.address?.line1 || "",
                addressLine2: customer.address?.line2 || "",
                locality: customer.address?.city || "",
                administrativeDistrictLevel1: customer.address?.state || "",
            },

        });

        if (!c.customer) {
            throw new Error("Customer not created");
        }
        this._customerId = c.customer.id;
        return c.customer;
    }

    async createCard(memberId: string, cardholderName: string, source: string, verificationToken?: string, billingAddress?: Address) {

        if (!this._customerId) {
            throw new Error("Customer not set");
        }


        const c = await this._client.cards.create({
            idempotencyKey: this.generateIdempotencyKey(),
            sourceId: source,
            card: {
                customerId: this._customerId,
                cardholderName: cardholderName,
                billingAddress: billingAddress ? {
                    ...billingAddress,
                    country: billingAddress.country || "US",
                } : undefined,
                referenceId: memberId,
            }
        });
        return c.card;
    }

    async getCards(customerId: string) {

        const cards = await this._client.cards.list({
            customerId: customerId,
        });
        return cards.data;
    }

    async retrieveCardForCustomer(customerId: string, cardId: string) {
        const cards = await this.getCards(customerId);
        const card = cards.find((candidate: { id?: string }) => candidate.id === cardId);
        if (!card) {
            const error = new Error("Square card does not belong to customer");
            (error as Error & { code?: string; statusCode?: number }).code = "resource_missing";
            (error as Error & { code?: string; statusCode?: number }).statusCode = 404;
            throw error;
        }
        return card;
    }

    async createCharge(customerId: string, sourceId: string, options: SquareChargeOptions) {
        const {
            total,
            feesAmount,
            currency,
            referenceId,
            squareLocationId,
            note,
        } = options || {};


        const data = await this._client.payments.create({
            idempotencyKey: this.generateIdempotencyKey(),
            customerId,
            appFeeMoney: {
                amount: BigInt(feesAmount),
                currency: Currency.Usd,
            },
            amountMoney: {
                amount: BigInt(total),
                currency: Currency.Usd,
            },
            note,
            autocomplete: true,
            sourceId: sourceId,
            referenceId: referenceId,
            locationId: squareLocationId,
        });
        return data.payment;
    }

    async refundPayment(paymentId: string, amount: number, reason?: string) {
        const data = await this._client.refunds.refundPayment({
            idempotencyKey: this.generateIdempotencyKey(),
            paymentId,
            amountMoney: {
                amount: BigInt(amount),
                currency: Currency.Usd,
            },
            reason,
        });
        if (!data.refund) {
            throw new Error("Square refund was not created");
        }
        return data.refund;
    }

}
