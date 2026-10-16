import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

const originalSignatureKey = process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = "test-signature-key";
afterAll(() => {
    if (originalSignatureKey === undefined) delete process.env.SQUARE_WEBHOOK_SIGNATURE_KEY;
    else process.env.SQUARE_WEBHOOK_SIGNATURE_KEY = originalSignatureKey;
});
let deferred = true;
const settle = mock(async () => {});
mock.module("square", () => ({ WebhooksHelper: { verifySignature: async () => true } }));
mock.module("@/db/db", () => ({ db: { query: {
    memberInvoices: { findFirst: async () => ({ memberPlanId: "sub" }) },
    memberSubscriptions: { findFirst: async () => ({ metadata: deferred ? {
        deferredBilling: { version: 1, firstPaymentAt: "2026-02-01T00:00:00Z", prorate: false, prorationAmount: 0 },
    } : {} }) },
} } }));
mock.module("./handlers/square/squarePlanSuccess", () => ({ handleSquarePlanSuccess: settle }));
mock.module("./handlers/square/squarePlanFail", () => ({ handleSquarePlanFail: async () => {} }));
mock.module("./handlers/square/squareOrderSuccess", () => ({ handleSquareOrderSuccess: async () => {} }));
mock.module("./handlers/square/squareOrderFail", () => ({ handleSquareOrderFail: async () => {} }));
const { squareWebhookRoutes } = await import("./square");
const request = () => new Request("http://localhost/square", {
    method: "POST",
    headers: { "content-type": "application/json", "x-square-hmacsha256-signature": "test" },
    body: JSON.stringify({ type: "payment.updated", data: { object: { payment: {
        id: "sq_payment", reference_id: "inv_test", status: "COMPLETED", source_type: "CARD", total_money: { amount: 100 },
    } } } }),
});
beforeEach(() => { deferred = true; settle.mockReset(); });

test("deferred Square processing failure requests redelivery and can recover", async () => {
    settle.mockRejectedValueOnce(new Error("Queue unavailable"));
    const app = squareWebhookRoutes(new Elysia());
    expect((await app.handle(request())).status).toBe(500);
    expect((await app.handle(request())).status).toBe(200);
    expect(settle).toHaveBeenCalledTimes(2);
});

test("ordinary Square events retain asynchronous acknowledgement", async () => {
    deferred = false;
    settle.mockRejectedValueOnce(new Error("Existing asynchronous failure"));
    expect((await squareWebhookRoutes(new Elysia()).handle(request())).status).toBe(200);
    expect(settle).toHaveBeenCalledTimes(1);
});
