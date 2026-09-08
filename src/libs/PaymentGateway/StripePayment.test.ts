import { expect, mock, test } from "bun:test";
import { Currency } from "square";
import Stripe from "stripe";
import { StripePaymentGateway } from "./StripePayment";


test("omits a zero application fee and keeps positive platform fees", async () => {
    const create = mock(async (_params: Stripe.PaymentIntentCreateParams) => ({ id: "pi_1", client_secret: "secret" }));
    const gateway = new StripePaymentGateway("test-token");
    Object.defineProperty(gateway, "_client", {
        value: { paymentIntents: { create } },
    });
    const options = {
        total: 10_000,
        feesAmount: 0,
        currency: Currency.Usd,
        metadata: { lid: "location-1" },
    };

    await gateway.createChargeWithoutLineItems("cus_1", "pm_1", options);
    await gateway.createChargeWithoutLineItems("cus_1", "pm_1", {
        ...options,
        feesAmount: 200,
    });

    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("application_fee_amount");
    expect(create.mock.calls[0]?.[0]).not.toHaveProperty("amount_details");
    expect(create.mock.calls[1]?.[0]).toEqual(expect.objectContaining({
        application_fee_amount: 200,
    }));
});

test("preserves Stripe errors from line-item charges", async () => {
    const stripeFailure = new Stripe.errors.StripeInvalidRequestError({
        type: "invalid_request_error",
        message: "Invalid amount details",
        code: "amount_mismatch",
    } as never);
    const create = mock(async (_params: Stripe.PaymentIntentCreateParams) => {
        throw stripeFailure;
    });
    const gateway = new StripePaymentGateway("test-token");
    Object.defineProperty(gateway, "_client", {
        value: { paymentIntents: { create } },
    });

    await expect(gateway.createCharge("cus_1", "pm_1", {
        total: 10_000,
        unitCost: 10_000,
        tax: 0,
        feesAmount: 0,
        currency: Currency.Usd,
        metadata: { lid: "location-1" },
    })).rejects.toBe(stripeFailure);
});
