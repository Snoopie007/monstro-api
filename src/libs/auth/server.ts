import { auth as betterAuth } from "@/libs/auth";
import { headers } from "next/headers";
import { buildUserPayload } from "./UserContext";

/**
 * Server-side auth helper - matches Next-Auth's auth() API
 * TODO: REFACTOR - Once we move to lean sessions, this can be simplified
 */
export async function auth() {
  const headersList = await headers();
  const session = await betterAuth.api.getSession({ 
    headers: headersList 
  });

  if (!session) return null;

  // Transform to match Next-Auth structure
  return {
    user: session.user, // Lean session ✅
    expires: new Date(session.session.expiresAt).toISOString(),
  };
}

// NEW: Helper for pages that need full context
export async function authWithContext() {
  const session = await auth();
  
  if (!session) return null;

  const userContext = await buildUserPayload(session.user.id);
  
  return {
    ...session,
    user: {
      ...session.user,
      ...userContext, // Enriched data ✅
    },
  };
}