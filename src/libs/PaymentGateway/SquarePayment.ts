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
    referenceId?: string;
    note?: string;
};

export function squarePaymentIdempotencyKey(idempotencyKey: string | undefined, generateIdempotencyKey: () => string = () => crypto.randomUUID()) {
    return idempotencyKey || generateIdempotencyKey();
}

export type SquareRefreshedToken = {
    accessToken: string;
    refreshToken: string;
    /** Access token expiry as unix ms (for `integrations.expires`). */
    expiresAt: number;
    merchantId?: string;
};

function createSquareOAuthClient() {
    return new SquareClient({
        environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
        version: SQUARE_API_VERSION,
    });
}

export class SquarePaymentGateway {
    private _client: SquareClient;
    constructor(accessToken: string) {
        this._client = new SquareClient({

            environment: isProd ? SquareEnvironment.Production : SquareEnvironment.Sandbox,
            token: accessToken,
            version: SQUARE_API_VERSION,
        });
    }

    /** Exchange a seller refresh token for a new access token via Square OAuth. */
    static async refreshAccessToken(refreshToken: string): Promise<SquareRefreshedToken> {
        const clientId = process.env.SQUARE_APPLICATION_ID;
        const clientSecret = process.env.SQUARE_APPLICATION_SECRET;
        if (!clientId || !clientSecret) {
            throw new Error("Square application credentials not configured");
        }

        const client = createSquareOAuthClient();
        const response = await client.oAuth.obtainToken({
            clientId,
            clientSecret,
            grantType: "refresh_token",
            refreshToken,
        });

        if (!response.accessToken) {
            throw new Error("Failed to refresh Square access token");
        }

        const expiresAt = response.expiresAt
            ? Date.parse(response.expiresAt)
            : Date.now() + 30 * 24 * 60 * 60 * 1000;

        return {
            accessToken: response.accessToken,
            refreshToken: response.refreshToken ?? refreshToken,
            expiresAt,
            merchantId: response.merchantId,
        };
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
        return c.customer;
    }


    async createCard(customerId: string, source: string, props: {
        cardholderName: string;
        billingAddress?: Address;
        referenceId: string;
    }) {
        const { cardholderName, billingAddress, referenceId } = props;


        const c = await this._client.cards.create({
            idempotencyKey: this.generateIdempotencyKey(),
            sourceId: source,
            card: {
                customerId: customerId,
                cardholderName: cardholderName,
                billingAddress: billingAddress ? {
                    ...billingAddress,
                    country: billingAddress.country || "US",
                } : undefined,
                referenceId,
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
            idempotencyKey,
        } = options || {};


        const data = await this._client.payments.create({
            idempotencyKey: squarePaymentIdempotencyKey(idempotencyKey, () => this.generateIdempotencyKey()),
            customerId,
            appFeeMoney: {
                amount: BigInt(feesAmount),
                currency
            },
            amountMoney: {
                amount: BigInt(total),
                currency
            },
            note,
            autocomplete: true,
            sourceId: sourceId,
            referenceId: referenceId,
            locationId: squareLocationId,
        });
        return data.payment;
    }

    async retrieveRefund(refundId: string) {
        const response = await this._client.refunds.get({ refundId });

        if (!response.refund) throw new Error("Square refund was not found");

        return response.refund;
    }

    async inspectPaymentRefunds(paymentId: string) {
        const response = await this._client.payments.get({ paymentId });

        if (!response.payment) throw new Error("Square payment was not found");

        const refunds = await Promise.all((response.payment.refundIds ?? []).map((refundId) => this.retrieveRefund(refundId)));

        return { payment: response.payment, refunds };
    }

    async findRefundByReason(paymentId: string, reason: string, requestedAt: string) {
        // Square's refund listing is eventually consistent. Absence is never
        // evidence that an interrupted refund can be submitted again.
        const refunds = await this._client.refunds.list({ beginTime: requestedAt, limit: 100 });

        for await (const refund of refunds) {
            if (refund.paymentId === paymentId && refund.reason === reason) return refund;
        }

        return null;
    }

    async refundPayment(paymentId: string, amount: number, reason?: string, idempotencyKey?: string, currency: Currency = Currency.Usd) {
        const data = await this._client.refunds.refundPayment({
            idempotencyKey: squarePaymentIdempotencyKey(idempotencyKey, () => this.generateIdempotencyKey()),
            paymentId,
            amountMoney: {
                amount: BigInt(amount),
                currency,
            },
            // Monstro's application fee is vendor-side and is never refunded.
            appFeeMoney: {
                amount: BigInt(0),
                currency,
            },
            reason,
        });
        if (!data.refund) {
            throw new Error("Square refund was not created");
        }
        return data.refund;
    }

}
