import { beforeEach, describe, expect, mock, test } from "bun:test";

const where = mock(() => undefined);
const set = mock(() => ({ where }));
const update = mock(() => ({ set }));
const refresh = mock();

mock.module("@/db/db", () => ({ db: { update } }));
mock.module("@subtrees/schemas", () => ({ integrations: { id: "integration-id" } }));
mock.module("drizzle-orm", () => ({ eq: mock(() => "where-integration") }));
mock.module("./AuthorizeOAuth", () => ({ refreshAuthorizeOAuthToken: refresh }));

const { authorizeAuthenticationFromIntegration } = await import("./AuthorizeAuthentication");

const integration = {
    id: "int-123",
    apiKey: null,
    secretKey: null,
    accessToken: "access-token",
    refreshToken: "refresh-token",
    expires: Date.now() + 120_000,
    metadata: { authorizeAuthMode: "oauth" as const },
};

describe("authorizeAuthenticationFromIntegration", () => {
    beforeEach(() => {
        update.mockClear();
        set.mockClear();
        where.mockClear();
        refresh.mockClear();
    });

    test("uses a current OAuth access token", async () => {
        expect(await authorizeAuthenticationFromIntegration(integration)).toEqual({
            accessToken: "access-token",
        });
        expect(refresh).not.toHaveBeenCalled();
    });

    test("refreshes and stores an expiring OAuth access token", async () => {
        refresh.mockResolvedValue({
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
            expiresAt: 3_601_000,
            refreshTokenExpiresAt: 31_536_001_000,
            scope: "read write",
            tokenType: "bearer",
            clientStatus: "active",
        });

        expect(await authorizeAuthenticationFromIntegration({ ...integration, expires: 1 })).toEqual({
            accessToken: "new-access-token",
        });
        expect(refresh).toHaveBeenCalledWith("refresh-token");
        expect(set).toHaveBeenCalledWith(expect.objectContaining({
            accessToken: "new-access-token",
            refreshToken: "new-refresh-token",
            expires: 3_601_000,
        }));
    });

    test("keeps manual credentials compatible", async () => {
        expect(await authorizeAuthenticationFromIntegration({
            ...integration,
            accessToken: null,
            refreshToken: null,
            expires: null,
            apiKey: "login",
            secretKey: "transaction-key",
        })).toEqual({ name: "login", transactionKey: "transaction-key" });
    });
});
