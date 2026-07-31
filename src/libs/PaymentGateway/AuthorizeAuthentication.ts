import { db } from "@/db/db";
import { integrations } from "@subtrees/schemas";
import type { AuthorizeMerchantAuthentication, Integration } from "@subtrees/types";
import { eq } from "drizzle-orm";
import { refreshAuthorizeOAuthToken } from "./AuthorizeOAuth";

type AuthorizeIntegration = Pick<
    Integration,
    "id" | "apiKey" | "secretKey" | "accessToken" | "refreshToken" | "expires" | "metadata"
>;

const REFRESH_WINDOW_MS = 60_000;

export async function authorizeAuthenticationFromIntegration(
    integration: AuthorizeIntegration,
): Promise<AuthorizeMerchantAuthentication> {
    if (!integration.accessToken) {
        if (!integration.apiKey || !integration.secretKey) {
            throw new Error("Authorize.net integration not found");
        }
        return { name: integration.apiKey, transactionKey: integration.secretKey };
    }

    if (integration.expires === null || integration.expires > Date.now() + REFRESH_WINDOW_MS) {
        return { accessToken: integration.accessToken };
    }
    if (!integration.refreshToken) {
        throw new Error("Authorize.net OAuth connection expired");
    }

    const token = await refreshAuthorizeOAuthToken(integration.refreshToken);
    await db.update(integrations).set({
        accessToken: token.accessToken,
        refreshToken: token.refreshToken,
        expires: token.expiresAt,
        metadata: {
            ...(integration.metadata ?? {}),
            authorizeAuthMode: "oauth",
            authorizeScope: token.scope,
            ...(token.refreshTokenExpiresAt !== null && {
                authorizeRefreshTokenExpiresAt: token.refreshTokenExpiresAt,
            }),
            ...(token.clientStatus !== null && {
                authorizeClientStatus: token.clientStatus,
            }),
        },
        updated: new Date(),
    }).where(eq(integrations.id, integration.id));

    return { accessToken: token.accessToken };
}
