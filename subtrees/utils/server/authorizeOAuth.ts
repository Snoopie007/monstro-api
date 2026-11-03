import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { integrations } from "../../schemas/integrations";

/** The merchantAuthentication block of an Authorize.net API request. */
export type AuthorizeCredentials =
  | { name: string; transactionKey: string }
  | { accessToken: string };

type AuthorizeIntegration = Pick<
  typeof integrations.$inferSelect,
  "id" | "apiKey" | "secretKey" | "accessToken" | "expires"
>;

// Lifetimes are read from each response because the docs and their samples disagree.
const TokenResponseSchema = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  expires_in: z.number(),
});

// Refresh early so a token cannot expire partway through a request.
const REFRESH_MARGIN_MS = 5 * 60 * 1000;

/** Authorize.net rejected the grant, so only the merchant can restore the connection. */
class AuthorizeGrantError extends Error {}

function isTokenFresh(expires: number | null) {
  return expires !== null && expires > Date.now() + REFRESH_MARGIN_MS;
}

async function requestToken(params: Record<string, string>) {
  const { AUTHORIZE_TOKEN_URL, AUTHORIZE_CLIENT_ID, AUTHORIZE_CLIENT_SECRET } = process.env;
  if (!AUTHORIZE_TOKEN_URL || !AUTHORIZE_CLIENT_ID || !AUTHORIZE_CLIENT_SECRET) {
    throw new Error("Authorize.net OAuth is not configured");
  }

  const response = await fetch(AUTHORIZE_TOKEN_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      "v-c-client-correlation-id": crypto.randomUUID(),
    },
    body: new URLSearchParams({
      ...params,
      client_id: AUTHORIZE_CLIENT_ID,
      client_secret: AUTHORIZE_CLIENT_SECRET,
    }).toString(),
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 400) throw new AuthorizeGrantError(await response.text());
  if (!response.ok) throw new Error(`Authorize.net token request failed with status ${response.status}`);

  const token = TokenResponseSchema.parse(await response.json());
  return {
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expires: Date.now() + token.expires_in * 1000,
  };
}

export function authorizeOAuthUrl(state: string) {
  const { AUTHORIZE_OAUTH_URL, AUTHORIZE_CLIENT_ID, AUTHORIZE_REDIRECT_URI } = process.env;
  if (!AUTHORIZE_OAUTH_URL || !AUTHORIZE_CLIENT_ID || !AUTHORIZE_REDIRECT_URI) {
    throw new Error("Authorize.net OAuth is not configured");
  }

  const query = new URLSearchParams({
    sub: "oauth",
    client_id: AUTHORIZE_CLIENT_ID,
    redirect_uri: AUTHORIZE_REDIRECT_URI,
    scope: "read,write",
    state,
  });
  return `${AUTHORIZE_OAUTH_URL}?${query}`;
}

export function exchangeAuthorizeCode(code: string) {
  // platform is missing from the docs' parameter table but is in their sample request and sample app.
  return requestToken({ grant_type: "authorization_code", code, platform: "2" });
}

/** Returns API keys or a usable access token, refreshing it first when it is about to expire. */
export async function getAuthorizeCredentials(
  db: Pick<PostgresJsDatabase<any>, "transaction" | "update">,
  integration: AuthorizeIntegration,
): Promise<AuthorizeCredentials> {
  if (!integration.accessToken) {
    if (!integration.apiKey || !integration.secretKey) throw new Error("Authorize.net credentials are missing");
    return { name: integration.apiKey, transactionKey: integration.secretKey };
  }
  if (isTokenFresh(integration.expires)) return { accessToken: integration.accessToken };

  try {
    // API, workers and vendor all refresh. The row lock stops them from racing with a rotated refresh token.
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(integrations).where(eq(integrations.id, integration.id)).for("update");
      if (current?.accessToken && isTokenFresh(current.expires)) return { accessToken: current.accessToken };
      if (!current?.refreshToken) throw new AuthorizeGrantError("Authorize.net refresh token is missing");

      const token = await requestToken({ grant_type: "refresh_token", refresh_token: current.refreshToken });
      await tx.update(integrations).set({ ...token, updated: new Date() }).where(eq(integrations.id, current.id));
      return { accessToken: token.accessToken };
    });
  } catch (error) {
    if (error instanceof AuthorizeGrantError) {
      await db.update(integrations).set({
        metadata: sql`coalesce(${integrations.metadata}, '{}'::jsonb) || '{"status":"reconnect_required"}'::jsonb`,
        updated: new Date(),
      }).where(eq(integrations.id, integration.id));
    }
    throw error;
  }
}
