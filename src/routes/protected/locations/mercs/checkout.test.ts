import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let input: Record<string, unknown> | undefined;
const handleMercCheckout = mock(async (props: Record<string, unknown>) => {
    input = props;
    return { id: "order-1" };
});

mock.module("@/handlers/merc", () => ({
    handleMercCheckout,
    mapMercCheckoutError: () => ({ error: "failed" }),
}));

const { locationMercsCheckout } = await import("./checkout");
const app = locationMercsCheckout(new Elysia({ prefix: "/:lid" }) as never);

beforeEach(() => {
    input = undefined;
    handleMercCheckout.mockClear();
});

test("accepts the legacy mobile merchandise checkout body", async () => {
    const response = await app.handle(new Request("http://localhost/location-1/mercs/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            paymentMethodId: "payment-method-1",
            items: [{ variantId: "variant-1", quantity: 1 }],
        }),
    }));

    expect(response.status).toBe(200);
    expect(input).toEqual({
        lid: "location-1",
        mid: "member-1",
        paymentMethodId: "payment-method-1",
        items: [{ variantId: "variant-1", quantity: 1 }],
        attemptId: expect.any(String),
    });
});
