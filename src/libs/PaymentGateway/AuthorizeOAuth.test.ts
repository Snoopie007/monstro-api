import { afterAll, beforeEach, expect, mock, test } from "bun:test";
import { refreshAuthorizeOAuthToken } from "./AuthorizeOAuth";

const originalFetch = globalThis.fetch;
const originalEnv = {
    AUTHORIZE_CLIENT_ID: process.env.AUTHORIZE_CLIENT_ID,
    AUTHORIZE_CLIENT_SECRET: process.env.AUTHORIZE_CLIENT_SECRET,
    AUTHORIZE_OAUTH_TOKEN_URL: process.env.AUTHORIZE_OAUTH_TOKEN_URL,
};
const fetchMock = mock();

beforeEach(() => {
    fetchMock.mockReset();
    globalThis.fetch = fetchMock as unknown as typeof fetch;
    process.env.AUTHORIZE_CLIENT_ID = "client-id";
    process.env.AUTHORIZE_CLIENT_SECRET = "client-secret";
    process.env.AUTHORIZE_OAUTH_TOKEN_URL = "https://authorize.test/oauth/token";
});

afterAll(() => {
    globalThis.fetch = originalFetch;
    for (const [name, value] of Object.entries(originalEnv)) {
        if (value === undefined) delete process.env[name];
        else process.env[name] = value;
    }
});

test("refreshes an Authorize.net OAuth token with the documented form fields", async () => {
    fetchMock.mockResolvedValue({
        ok: true,
        json: async () => ({
            access_token: "new-access-token",
            refresh_token: "new-refresh-token",
            expires_in: 3600,
            scope: "read write",
            token_type: "bearer",
        }),
    });

    expect(await refreshAuthorizeOAuthToken("current-refresh-token")).toEqual(expect.objectContaining({
        accessToken: "new-access-token",
        refreshToken: "new-refresh-token",
        scope: "read write",
    }));
    const request = fetchMock.mock.calls[0]![1] as RequestInit;
    expect(Object.fromEntries(new URLSearchParams(String(request.body)))).toEqual({
        grant_type: "refresh_token",
        refresh_token: "current-refresh-token",
        client_id: "client-id",
        client_secret: "client-secret",
    });
});
