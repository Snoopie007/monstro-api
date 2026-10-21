import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

let subscription: { locationId: string; paymentType: string } | undefined;
const findFirst = mock(async () => subscription);
const addAddon = mock(async (_locationId: string, _subscriptionId: string, _addonId: string) => ({
    status: "created" as const,
    purchase: { id: "msa-1" },
}));

mock.module("@/db/db", () => ({ db: { query: { memberSubscriptions: { findFirst } } } }));
mock.module("@/routes/x/loc/addonsBundles/addAddon", () => ({ addAddon }));
mock.module("@/routes/x/loc/addonsBundles/subscriptionAddons", () => ({
    getAddonOverview: async () => ({
        availableAddons: [
            { id: "adn-1", unavailableReason: null },
            { id: "adn-2", unavailableReason: "Already added to this subscription" },
        ],
    }),
}));

const { memberPlansAddonRoutes } = await import("./addons");
const app = memberPlansAddonRoutes(new Elysia({ prefix: "/member/:mid/plans/:pid" }) as never);
const url = "http://localhost/member/mbr-1/plans/sub-1/addons";

function addAddonRequest() {
    return app.handle(new Request(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ addonId: "adn-1" }),
    }));
}

beforeEach(() => {
    subscription = { locationId: "loc-1", paymentType: "card" };
    addAddon.mockClear();
});

test("adds the add-on to the member's card subscription", async () => {
    const response = await addAddonRequest();

    expect(response.status).toBe(202);
    expect(addAddon.mock.calls[0]).toEqual(["loc-1", "sub-1", "adn-1"]);
});

test("does not add add-ons to a cash subscription", async () => {
    subscription = { locationId: "loc-1", paymentType: "cash" };
    const response = await addAddonRequest();

    expect(response.status).toBe(409);
    expect(addAddon).not.toHaveBeenCalled();
});

test("lists add-ons on a cash subscription as unavailable, keeping existing reasons", async () => {
    subscription = { locationId: "loc-1", paymentType: "cash" };
    const response = await app.handle(new Request(url));
    const { subscriptionAddons } = await response.json() as { subscriptionAddons: { availableAddons: unknown[] } };

    expect(subscriptionAddons.availableAddons).toEqual([
        { id: "adn-1", unavailableReason: "Ask the front desk to add this to a cash subscription" },
        { id: "adn-2", unavailableReason: "Already added to this subscription" },
    ]);
});

test("another member's subscription is not found", async () => {
    subscription = undefined;

    expect((await addAddonRequest()).status).toBe(404);
});
