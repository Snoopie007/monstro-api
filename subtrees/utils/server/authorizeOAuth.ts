import { eq, sql } from "drizzle-orm";
import type { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { z } from "zod";
import { integrations } from "../../schemas/integrations";

type AuthorizeDatabase = Pick<PostgresJsDatabase<any>, "transaction" | "update">;

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

export async function requestAuthorizeToken(params: Record<string, string>) {
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

// API, workers and vendor all refresh. The row lock stops them from racing with a rotated refresh token.
async function refreshAuthorizeToken(db: AuthorizeDatabase, integrationId: string) {
  try {
    return await db.transaction(async (tx) => {
      const [current] = await tx.select().from(integrations).where(eq(integrations.id, integrationId)).for("update");
      if (current?.accessToken && isTokenFresh(current.expires)) return current.accessToken;
      if (!current?.refreshToken) throw new AuthorizeGrantError("Authorize.net refresh token is missing");

      const token = await requestAuthorizeToken({ grant_type: "refresh_token", refresh_token: current.refreshToken });
      await tx.update(integrations).set({ ...token, updated: new Date() }).where(eq(integrations.id, current.id));
      return token.accessToken;
    });
  } catch (error) {
    if (error instanceof AuthorizeGrantError) {
      await db.update(integrations).set({
        metadata: sql`coalesce(${integrations.metadata}, '{}'::jsonb) || '{"status":"reconnect_required"}'::jsonb`,
        updated: new Date(),
      }).where(eq(integrations.id, integrationId));
    }
    throw error;
  }
}

/** Returns a usable access token, refreshing it first when it is about to expire. */
export async function getAuthorizeAccessToken(
  db: AuthorizeDatabase,
  integration: Pick<typeof integrations.$inferSelect, "id" | "accessToken" | "expires">,
) {
  if (integration.accessToken && isTokenFresh(integration.expires)) return integration.accessToken;
  return refreshAuthorizeToken(db, integration.id);
}
