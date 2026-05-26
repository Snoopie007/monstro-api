import { getOAuthState, createAuthMiddleware } from "better-auth/api";
import type { BetterAuthPlugin } from "better-auth";

export const sessionBridge = (): BetterAuthPlugin => ({
    id: "SessionBridge",
    hooks: {
        after: [{
            matcher: (ctx) => ctx?.path?.startsWith("/callback/") ?? false,
            handler: createAuthMiddleware(async (ctx) => {

                const state = await getOAuthState();

                if (!state?.callbackURL) return;

                // Read the actual cookie value better-auth set in the response
                const cookieName = ctx.context.authCookies.sessionToken.name;
                const setCookieHeader = ctx.context.responseHeaders?.get("set-cookie") ?? "";
                const match = setCookieHeader.match(new RegExp(`${cookieName}=([^;]+)`));
                const sessionToken = match?.[1]

                if (!sessionToken) return;
                const redirectTo = new URL(state.callbackURL);
                // decodeURIComponent so the value isn't double-encoded in the query param
                redirectTo.searchParams.set("session_token", decodeURIComponent(sessionToken));

                return ctx.redirect(redirectTo.toString());
            }),
        }],
    },
});