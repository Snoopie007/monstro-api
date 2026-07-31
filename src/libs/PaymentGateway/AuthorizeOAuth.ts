import type { AuthorizeOAuthToken } from "@subtrees/types";

type AuthorizeOAuthTokenResponse = {
    access_token?: unknown;
    refresh_token?: unknown;
    expires_in?: unknown;
    refresh_token_expires_in?: unknown;
    scope?: unknown;
    token_type?: unknown;
    client_status?: unknown;
};

function env(name: string) {
    const value = process.env[name];
    if (!value) throw new Error(`Missing ${name}`);
    return value;
}

export async function refreshAuthorizeOAuthToken(refreshToken: string): Promise<AuthorizeOAuthToken> {
    const response = await fetch(env("AUTHORIZE_OAUTH_TOKEN_URL"), {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: refreshToken,
            client_id: env("AUTHORIZE_CLIENT_ID"),
            client_secret: env("AUTHORIZE_CLIENT_SECRET"),
        }),
        signal: AbortSignal.timeout(10_000),
    });
    if (!response.ok) throw new Error("Authorize.net OAuth refresh failed");

    const value = await response.json() as unknown;
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        throw new Error("Authorize.net returned an invalid OAuth response");
    }
    const body = value as AuthorizeOAuthTokenResponse;
    if (
        typeof body.access_token !== "string" || !body.access_token ||
        typeof body.refresh_token !== "string" || !body.refresh_token ||
        typeof body.expires_in !== "number" || !Number.isFinite(body.expires_in) || body.expires_in <= 0 ||
        typeof body.scope !== "string" || !body.scope ||
        typeof body.token_type !== "string" || !body.token_type
    ) {
        throw new Error("Authorize.net returned an invalid OAuth response");
    }
    if (
        body.refresh_token_expires_in !== undefined &&
        (typeof body.refresh_token_expires_in !== "number" ||
            !Number.isFinite(body.refresh_token_expires_in) ||
            body.refresh_token_expires_in <= 0)
    ) {
        throw new Error("Authorize.net returned an invalid OAuth response");
    }

    const now = Date.now();
    return {
        accessToken: body.access_token,
        refreshToken: body.refresh_token,
        expiresAt: now + body.expires_in * 1000,
        refreshTokenExpiresAt: typeof body.refresh_token_expires_in === "number"
            ? now + body.refresh_token_expires_in * 1000
            : null,
        scope: body.scope,
        tokenType: body.token_type,
        clientStatus: typeof body.client_status === "string" ? body.client_status : null,
    };
}
