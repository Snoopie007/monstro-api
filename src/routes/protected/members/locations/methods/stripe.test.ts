import { beforeEach, expect, mock, test } from "bun:test";
import { Elysia } from "elysia";

type MemberLocation = { memberId: string; gatewayCustomerId?: string | null };
type Subscription = {
    id: string;
    parentId: string | null;
    memberId: string;
    metadata: Record<string, unknown>;
};

let memberLocationResult: MemberLocation | null = { memberId: "member-1" };
let familyAccessResult: { id: string } | null = null;
let subscriptionResults: Subscription[] = [];
let locationStateResult: { paymentGatewayId: string | null } | null = { paymentGatewayId: "integration-1" };
let integrationResult: { accountId: string; accessToken: string } | null = {
    accountId: "acct-1",
    accessToken: "sk_test_1",
};
let memberResult = {
    id: "member-1",
    email: "member@example.com",
    phone: null,
    firstName: "Member",
    lastName: "One",
};

const findMemberLocation = mock(async () => memberLocationResult);
const findFamilyAccess = mock(async () => familyAccessResult);
const findSubscriptions = mock(async () => subscriptionResults);
const findLocationState = mock(async () => locationStateResult);
const findIntegration = mock(async () => integrationResult);
const findMember = mock(async () => memberResult);
const insertConflictUpdate = mock(async () => undefined);
const insertValues = mock(() => ({ onConflictDoUpdate: insertConflictUpdate }));
const insert = mock(() => ({ values: insertValues }));

type StripePaymentMethodFixture = {
    id: string;
    type: string;
    card?: { brand: string; last4: string; exp_month: number; exp_year: number };
    us_bank_account?: { bank_name: string; last4: string; account_type: string };
};

const gatewayTokens: string[] = [];
const gatewayGetPaymentMethods = mock(async (): Promise<StripePaymentMethodFixture[]> => []);
const gatewayCreateSetupIntent = mock(async (customerId: string) => ({
    customer: customerId,
    client_secret: "seti_secret",
}));
const gatewayCreateEphemeralKey = mock(async () => ({ secret: "ek_secret" }));
const gatewayCreateCustomer = mock(async () => ({ id: "cus_new" }));

class MockStripePaymentGateway {
    constructor(accessToken: string) {
        gatewayTokens.push(accessToken);
    }

    getPaymentMethods = gatewayGetPaymentMethods;
    createSetupIntent = gatewayCreateSetupIntent;
    createEphemeralKey = gatewayCreateEphemeralKey;
    createCustomer = gatewayCreateCustomer;
}

mock.module("@/db/db", () => ({
    db: {
        query: {
            memberLocations: { findFirst: findMemberLocation },
            familyMembers: { findFirst: findFamilyAccess },
            memberSubscriptions: {
                findMany: findSubscriptions,
            },
            locationState: { findFirst: findLocationState },
            integrations: { findFirst: findIntegration },
            members: { findFirst: findMember },
        },
        insert,
    },
}));
class MockAuthorizePaymentGateway {}
class MockAuthorizeApiError extends Error {}

const authorizeMerchantCustomerId = mock(() => undefined);

mock.module("@/libs/PaymentGateway", () => ({
    StripePaymentGateway: MockStripePaymentGateway,
    SquarePaymentGateway: class {},
    AuthorizePaymentGateway: MockAuthorizePaymentGateway,
    AuthorizeApiError: MockAuthorizeApiError,
    authorizeMerchantCustomerId,
}));

const { memberLocationAccessDenied, StripePaymentMethodsRoutes } = await import("./stripe");
const { getStripePaymentMethods, getStripeSetupIntent } = await import("@/handlers/paymentMethods");
const routeApp = new Elysia({ prefix: "/:mid/:lid" })
    .derive(() => ({ memberId: "child-1", isServiceRole: false }))
    .use(StripePaymentMethodsRoutes);

beforeEach(() => {
    memberLocationResult = { memberId: "member-1" };
    familyAccessResult = null;
    subscriptionResults = [];
    locationStateResult = { paymentGatewayId: "integration-1" };
    integrationResult = { accountId: "acct-1", accessToken: "sk_test_1" };
    memberResult = {
        id: "member-1",
        email: "member@example.com",
        phone: null,
        firstName: "Member",
        lastName: "One",
    };
    gatewayTokens.length = 0;
    mock.clearAllMocks();
});


test("rejects a regular member from another member's payment methods", async () => {
    const denied = await memberLocationAccessDenied("member-2", "location-1", "member-1", false);

    expect(denied).toEqual({
        error: "You cannot access another member's payment methods",
        code: "FORBIDDEN",
    });
    expect(findMemberLocation).not.toHaveBeenCalled();
});

test("requires the target member to belong to the requested location", async () => {
    memberLocationResult = null;

    const denied = await memberLocationAccessDenied("member-1", "location-2", "member-1", false);

    expect(denied).toEqual({ error: "Member location not found", code: "FORBIDDEN" });
});
test("allows a verified family guardian to access the dependent's location", async () => {
    familyAccessResult = { id: "family-1" };

    const denied = await memberLocationAccessDenied("child-1", "location-1", "guardian-1", false);

    expect(denied).toBeNull();
});


test("allows only an explicit service-role bypass without member-location lookup", async () => {
    const denied = await memberLocationAccessDenied("member-2", "location-2", null, true);

    expect(denied).toBeNull();
    expect(findMemberLocation).not.toHaveBeenCalled();
});

test("lists only card and bank methods from an access child's collecting payer", async () => {
    memberLocationResult = { memberId: "child-1" };
    subscriptionResults = [
        { id: "child-sub", parentId: "root-sub", memberId: "child-1", metadata: {} },
        {
            id: "root-sub",
            parentId: null,
            memberId: "payer-1",
            metadata: { gatewayIntegrationId: "integration-1", gatewayCustomerId: "cus-root" },
        },
    ];
    gatewayGetPaymentMethods.mockResolvedValue([
        {
            id: "pm_card",
            type: "card",
            card: { brand: "visa", last4: "4242", exp_month: 12, exp_year: 2030 },
        },
        {
            id: "pm_bank",
            type: "us_bank_account",
            us_bank_account: { bank_name: "Bank", last4: "6789", account_type: "checking" },
        },
        { id: "pm_link", type: "link" },
    ]);

    const methods = await getStripePaymentMethods("child-1", "location-1");

    expect(gatewayGetPaymentMethods).toHaveBeenCalledWith("cus-root");
    expect(methods.map(({ id }) => id)).toEqual(["pm_card", "pm_bank"]);
    expect(gatewayCreateCustomer).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
});

test("reuses an access child's collecting payer for setup without creating a customer", async () => {
    memberLocationResult = { memberId: "child-1" };
    subscriptionResults = [
        { id: "child-sub", parentId: "root-sub", memberId: "child-1", metadata: {} },
        {
            id: "root-sub",
            parentId: null,
            memberId: "payer-1",
            metadata: { gatewayIntegrationId: "integration-1", gatewayCustomerId: "cus-root" },
        },
    ];

    const result = await getStripeSetupIntent({ mid: "child-1", lid: "location-1" });

    expect(result.customer).toBe("cus-root");
    expect(gatewayCreateSetupIntent).toHaveBeenCalledWith("cus-root");
    expect(gatewayCreateCustomer).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
});

test("rejects ambiguous collecting payers before gateway use or customer upsert", async () => {
    memberLocationResult = { memberId: "child-1" };
    subscriptionResults = [
        { id: "child-sub-a", parentId: "root-sub-a", memberId: "child-1", metadata: {} },
        { id: "child-sub-b", parentId: "root-sub-b", memberId: "child-1", metadata: {} },
        {
            id: "root-sub-a",
            parentId: null,
            memberId: "payer-a",
            metadata: { gatewayIntegrationId: "integration-a", gatewayCustomerId: "cus-a" },
        },
        {
            id: "root-sub-b",
            parentId: null,
            memberId: "payer-b",
            metadata: { gatewayIntegrationId: "integration-b", gatewayCustomerId: "cus-b" },
        },
    ];

    await expect(getStripeSetupIntent({ mid: "child-1", lid: "location-1" }))
        .rejects.toThrow("Multiple Stripe billing customers require support");

    expect(gatewayTokens).toEqual([]);
    expect(gatewayCreateCustomer).not.toHaveBeenCalled();
    expect(insert).not.toHaveBeenCalled();
});

test("does not use a metadata integration outside the requested Stripe location", async () => {
    subscriptionResults = [{
        id: "root-sub",
        parentId: null,
        memberId: "member-1",
        metadata: { gatewayIntegrationId: "integration-other", gatewayCustomerId: "cus-other" },
    }];
    integrationResult = null;

    await expect(getStripePaymentMethods("member-1", "location-1"))
        .rejects.toThrow("Stripe integration not found");

    expect(gatewayTokens).toEqual([]);
});

test("maps ambiguous mobile setup to 409 before any write", async () => {
    memberLocationResult = { memberId: "child-1" };
    subscriptionResults = [
        { id: "child-sub-a", parentId: "root-sub-a", memberId: "child-1", metadata: {} },
        { id: "child-sub-b", parentId: "root-sub-b", memberId: "child-1", metadata: {} },
        {
            id: "root-sub-a",
            parentId: null,
            memberId: "payer-a",
            metadata: { gatewayIntegrationId: "integration-a", gatewayCustomerId: "cus-a" },
        },
        {
            id: "root-sub-b",
            parentId: null,
            memberId: "payer-b",
            metadata: { gatewayIntegrationId: "integration-b", gatewayCustomerId: "cus-b" },
        },
    ];

    const response = await routeApp.handle(new Request(
        "http://localhost/child-1/location-1/stripe/intent",
    ));

    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({ code: "AMBIGUOUS_BILLING_CUSTOMER" });
    expect(insert).not.toHaveBeenCalled();
});
