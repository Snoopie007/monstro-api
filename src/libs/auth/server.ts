import { auth as betterAuth } from "@/libs/auth";
import { headers } from "next/headers";
import type { ExtendedUser } from "@/types/user";

export interface AuthSession {
  user: ExtendedUser;
  expires: string;
}

/**
 * Server-side auth helper - matches Next-Auth's auth() API
 * Returns full user context including role, locations, and sbToken
 */
export async function auth(): Promise<AuthSession | null> {
  const headersList = await headers();
  const session = await betterAuth.api.getSession({
    headers: headersList
  });

  if (!session) return null;

  // Transform to match Next-Auth structure
  // Session now includes all context from customSession plugin
  return {
    user: session.user as ExtendedUser,
    expires: new Date(session.session.expiresAt).toISOString(),
  };
}
