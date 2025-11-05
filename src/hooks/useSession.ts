"use client";

import { 
  useSession as useBetterAuthSession,
  signIn as betterAuthSignIn,
  signOut as betterAuthSignOut,
} from "@/libs/auth/client";
import { useMemo } from "react";

/**
 * Client session hook - matches Next-Auth's useSession API
 * TODO: REFACTOR - Replace with useUserContext() + lean sessions
 */
export function useSession() {
  const { data: session, isPending, error } = useBetterAuthSession();

  const transformedSession = useMemo(() => {
    if (!session?.user) return null;

    return {
      user: session.user,
      expires: new Date(session.session.expiresAt).toISOString(),
    };
  }, [session]);

  return {
    data: transformedSession,
    status: isPending 
      ? "loading" 
      : transformedSession 
        ? "authenticated" 
        : "unauthenticated",
    
    // TODO: REFACTOR - Better Auth doesn't have update()
    // Temporary workaround: reload page
    // Proper fix: Use SWR mutate() with user context
    update: async (data?: any) => {
      console.warn(
        "⚠️ Session update not supported - reload page or refactor to lean sessions"
      );
      window.location.reload();
    },
  };
}

// Wrap signIn to match Next-Auth API
export async function signIn(
  provider: string,
  options: { 
    email: string; 
    password: string; 
    redirect?: boolean;
    callbackUrl?: string;
    [key: string]: any;
  }
) {
  try {
    if (provider === "credentials") {
      const result = await betterAuthSignIn.email({
        email: options.email,
        password: options.password,
        callbackURL: options.callbackUrl,
      });

      if (result.error) {
        return {
          error: result.error.message || "Authentication failed",
          ok: false,
          status: 401,
        };
      }

      return {
        ok: true,
        status: 200,
        url: options.callbackUrl || "/",
      };
    }

    throw new Error(`Provider ${provider} not supported`);
  } catch (error: any) {
    return {
      error: error.message || "Authentication failed",
      ok: false,
      status: 500,
    };
  }
}

export { betterAuthSignOut as signOut };