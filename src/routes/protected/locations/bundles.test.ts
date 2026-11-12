import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

type PrepareResult = { status: string; error?: string; checkoutCreated?: false };

let prepareResult: PrepareResult = { status: "created" };
const prepareBundle = mock(async (_input: Record<string, unknown>) => prepareResult);
const payBundle = mock(async (_input: Record<string, unknown>) => ({
    status: "ok" as const,
    value: { purchase: { id: "bpur_1" }, payment: "active" },
}));

mock.module("@/handlers/addonsBundles/checkout/prepare", () => ({
    prepareBundle,
    bundlePurchaseErrorCodes: { "bundle-not-found": 404, "payment-unavailable": 400 },
}));
mock.module("@/handlers/addonsBundles/checkout/pay", () => ({ payBundle }));
mock.module("@/routes/x/loc/addonsBundles/catalog", () => ({ listMemberBundles: async () => [] }));

const { locationBundles } = await import("./bundles");
const app = locationBundles(new Elysia({ prefix: "/:lid" }) as never);

function purchase(body: Record<string, unknown>) {
    return app.handle(new Request("http://localhost/loc-1/bundles/bnd-1/purchase", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ mid: "mbr-1", purchaseId: "bpur_1", paymentMethodId: "pm-1", paymentType: "card", ...body }),
    }));
}

beforeEach(() => {
    prepareResult = { status: "created" };
    prepareBundle.mockClear();
    payBundle.mockClear();
});

test("prepares the member's bundle, then pays it with the same card", async () => {
    const response = await purchase({});

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ purchase: { id: "bpur_1" }, payment: "active" });
    expect(prepareBundle.mock.calls[0]?.[0]).toEqual({
        locationId: "loc-1", bundleId: "bnd-1", memberId: "mbr-1", purchaseId: "bpur_1",
        paymentMethodId: "pm-1", paymentType: "card", selectedOptionalComponentIds: [],
    });
    expect(payBundle.mock.calls[0]?.[0]).toEqual({
        locationId: "loc-1", bundleId: "bnd-1", purchaseId: "bpur_1", paymentMethodId: "pm-1", paymentType: "card",
    });
});

test("does not accept cash", async () => {
    const response = await purchase({ paymentType: "cash" });

    expect(response.status).toBe(422);
    expect(prepareBundle).not.toHaveBeenCalled();
});

test("a rejected preparation is not paid and tells the app to start over", async () => {
    prepareResult = { status: "bundle-not-found", error: "Bundle not found", checkoutCreated: false };
    const response = await purchase({});

    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({ error: "Bundle not found", code: "BUNDLE_PREPARE_REJECTED" });
    expect(payBundle).not.toHaveBeenCalled();
});
