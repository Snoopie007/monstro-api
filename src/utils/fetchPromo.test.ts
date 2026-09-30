import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";
import type { MemberPlanPricing, Promo } from "@/subtrees/types";

const pricing = {
    id: "fast-pass-30-days",
    name: "30 Days",
    price: 19900,
    plan: { locationId: "location-1", archived: false },
} as MemberPlanPricing;

const samplePromo: Promo = {
    id: "promo-1",
    locationId: "location-1",
    code: "FREEPACKAGE",
    type: "percentage",
    value: 100,
    duration: "once",
    durationInMonths: null,
    redemptionCount: 0,
    maxRedemptions: null,
    expiresAt: null,
    isActive: true,
    allowedPlans: [pricing.id],
    forOrders: false,
    created: new Date("2026-10-01T00:00:00.000Z"),
    updated: null,
};

let storedPromo: Promo | undefined;
const findFirst = mock(async () => storedPromo);
mock.module("@/db/db", () => ({
    db: { query: { promos: { findFirst } } },
}));

const { fetchPromoDiscount, PromoValidationError } = await import("./fetchPromo");
const { xPromos } = await import("@/routes/x/loc/promos/root");
const app = new Elysia().group("/x/loc/:lid", (group) => group.use(xPromos));

const expectedDiscount = {
    type: "percentage",
    value: 100,
    duration: "once",
    durationInMonths: null,
} as const;

beforeEach(() => {
    storedPromo = { ...samplePromo };
    findFirst.mockClear();
});

for (const allowedPlans of [null, []]) {
    test(`an unrestricted promo with allowedPlans=${JSON.stringify(allowedPlans)} survives validation and enrollment lookup`, async () => {
        storedPromo = { ...samplePromo, allowedPlans };
        const response = await app.handle(new Request("http://localhost/x/loc/location-1/promos/validate", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
                pricingId: pricing.id,
                promoCode: samplePromo.code,
                memberId: "member-1",
                usageType: "package",
            }),
        }));

        expect(response.status).toBe(200);
        const validation = await response.json() as { ok: boolean; promoId: string; code: null; message: null };
        expect(validation).toEqual({ ok: true, promoId: samplePromo.id, code: null, message: null });
        await expect(fetchPromoDiscount(validation.promoId, pricing, samplePromo.locationId))
            .resolves.toEqual(expectedDiscount);
    });
}

test("a promo restricted to the selected pricing returns its discount", async () => {
    await expect(fetchPromoDiscount(samplePromo.id, pricing, samplePromo.locationId))
        .resolves.toEqual(expectedDiscount);
});

test("a promo restricted to another pricing is rejected", async () => {
    storedPromo = { ...samplePromo, allowedPlans: ["another-pricing"] };

    await expect(fetchPromoDiscount(samplePromo.id, pricing, samplePromo.locationId))
        .rejects.toThrow("Promotion is not valid for this location and pricing");
});

test("an unrestricted promo cannot be used with another location's pricing", async () => {
    storedPromo = { ...samplePromo, allowedPlans: null };
    const otherPricing = { ...pricing, plan: { ...pricing.plan!, locationId: "location-2" } };

    await expect(fetchPromoDiscount(samplePromo.id, otherPricing, samplePromo.locationId))
        .rejects.toBeInstanceOf(PromoValidationError);
});

test("an unrestricted promo cannot be used with an archived plan", async () => {
    storedPromo = { ...samplePromo, allowedPlans: null };
    const archivedPricing = { ...pricing, plan: { ...pricing.plan!, archived: true } };

    await expect(fetchPromoDiscount(samplePromo.id, archivedPricing, samplePromo.locationId))
        .rejects.toBeInstanceOf(PromoValidationError);
});

test("an unrestricted promo still respects its redemption limit", async () => {
    storedPromo = { ...samplePromo, allowedPlans: null, maxRedemptions: 1, redemptionCount: 1 };

    await expect(fetchPromoDiscount(samplePromo.id, pricing, samplePromo.locationId))
        .rejects.toBeInstanceOf(PromoValidationError);
});

test("a missing promo is rejected", async () => {
    storedPromo = undefined;

    await expect(fetchPromoDiscount(samplePromo.id, pricing, samplePromo.locationId))
        .rejects.toBeInstanceOf(PromoValidationError);
});

test("checkout without a promo does not query promo eligibility", async () => {
    await expect(fetchPromoDiscount(undefined, pricing, samplePromo.locationId)).resolves.toBeUndefined();
    expect(findFirst).not.toHaveBeenCalled();
});
