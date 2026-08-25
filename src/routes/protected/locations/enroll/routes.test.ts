import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let input: Record<string, unknown> | undefined;
let packageInput: Record<string, unknown> | undefined;
const handleEnrollSubscription = mock(async (props: Record<string, unknown>) => {
    input = props;
    return { ok: true };
});
const handleEnrollPackage = mock(async (props: Record<string, unknown>) => {
    packageInput = props;
    return { ok: true };
});

mock.module("@/handlers/enroll", () => ({
    handleEnrollSubscription,
    handleEnrollPackage,
    mapEnrollSubError: () => ({ error: "failed" }),
    mapEnrollPkgError: () => ({ error: "failed" }),
}));

const { subEnrollRoutes } = await import("./sub");
const { pkgEnrollRoutes } = await import("./pkg");
const app = subEnrollRoutes(new Elysia({ prefix: "/:lid" }) as never);
const packageApp = pkgEnrollRoutes(new Elysia({ prefix: "/:lid" }) as never);

beforeEach(() => {
    input = undefined;
    packageInput = undefined;
    handleEnrollSubscription.mockClear();
    handleEnrollPackage.mockClear();
});

test("passes subscription options to the enrollment handler", async () => {
    const response = await app.handle(new Request("http://localhost/location-1/sub/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            paymentMethodId: "payment-method-1",
            priceId: "pricing-1",
            attemptId: "attempt-1",
            promoId: null,
            paymentType: "card",
            startDate: "2030-01-01T00:00:00.000Z",
            endDate: "2030-04-01T00:00:00.000Z",
            trialDays: 7,
            allowProration: true,
        }),
    }));

    expect(response.status).toBe(200);
    expect(input).toEqual({
        lid: "location-1",
        mid: "member-1",
        paymentMethodId: "payment-method-1",
        priceId: "pricing-1",
        promoId: null,
        paymentType: "card",
        startDate: "2030-01-01T00:00:00.000Z",
        endDate: "2030-04-01T00:00:00.000Z",
        trialDays: 7,
        allowProration: true,
    });
});

test("accepts the legacy mobile package enrollment body", async () => {
    const response = await packageApp.handle(new Request("http://localhost/location-1/pkg/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            memberPlanId: "plan-1",
            paymentMethodId: "payment-method-1",
            priceId: "pricing-1",
            paymentType: "card",
        }),
    }));

    expect(response.status).toBe(200);
    expect(packageInput).toEqual({
        lid: "location-1",
        mid: "member-1",
        paymentMethodId: "payment-method-1",
        priceId: "pricing-1",
        attemptId: expect.any(String),
        paymentType: "card",
    });
});

test("accepts a cash package without a gateway payment method", async () => {
    const response = await packageApp.handle(new Request("http://localhost/location-1/pkg/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            priceId: "pricing-1",
            paymentType: "cash",
            attemptId: "attempt-1",
        }),
    }));

    expect(response.status).toBe(200);
    expect(packageInput).toEqual({
        lid: "location-1",
        mid: "member-1",
        priceId: "pricing-1",
        paymentMethodId: undefined,
        paymentType: "cash",
        promoId: undefined,
        attemptId: "attempt-1",
        startDate: undefined,
        expireDate: undefined,
        totalClassLimit: undefined,
    });
});

test("rejects a paid package without a payment method", async () => {
    const response = await packageApp.handle(new Request("http://localhost/location-1/pkg/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            priceId: "pricing-1",
            paymentType: "card",
        }),
    }));

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({ error: "Payment method is required" });
    expect(handleEnrollPackage).not.toHaveBeenCalled();
});

test("accepts the legacy mobile enrollment body", async () => {
    const response = await app.handle(new Request("http://localhost/location-1/sub/", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
            mid: "member-1",
            memberPlanId: "plan-1",
            paymentMethodId: "payment-method-1",
            priceId: "pricing-1",
            paymentType: "card",
        }),
    }));

    expect(response.status).toBe(200);
    expect(input).toEqual(expect.objectContaining({
        lid: "location-1",
        mid: "member-1",
        paymentMethodId: "payment-method-1",
        priceId: "pricing-1",
        paymentType: "card",
    }));
    expect(input).not.toHaveProperty("attemptId");
});
