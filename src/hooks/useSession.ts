"use client";

import {
	useSession as useBetterAuthSession,
	signIn as betterAuthSignIn,
	signOut as betterAuthSignOut,
} from "@/libs/auth/client";
import { useMemo } from "react";
import { useUserContext } from "./useUserContext";

/**
 * Client session hook - matches Next-Auth's useSession API
 * TODO: REFACTOR - Replace with useUserContext() + lean sessions
 */
export function useSession() {
	const { data: session, isPending } = useBetterAuthSession();
	const { userContext, isLoading: contextLoading, refresh: refreshContext } = useUserContext();

	const transformedSession = useMemo(() => {
		if (!session?.user) return null;

		return {
			user: {
				...session.user,
				...userContext,
			},
			expires: new Date(session.session.expiresAt).toISOString(),
		};
	}, [session, userContext]);

	return {
		data: transformedSession,
		status: isPending || contextLoading
			? "loading"
			: transformedSession
				? "authenticated"
				: "unauthenticated",

		update: async () => {
			await refreshContext();
		},
	};
}

/**
 * Sign in wrapper - matches Next-Auth API
 * Two-step process: 1) Verify OTP, 2) Authenticate with Better Auth
 * Can skip OTP verification for new account onboarding flows
 */
export async function signIn(
	provider: string,
	options: {
		email: string;
		password: string;
		token?: string;
		type?: string;
		redirect?: boolean;
		callbackUrl?: string;
		skipVerification?: boolean;
		[key: string]: any;
	}
) {
	try {
		if (provider === "credentials") {
			// Skip OTP verification for new account onboarding
			if (!options.skipVerification) {
				const verifyResponse = await fetch("/api/auth/login/verify", {
					method: "POST",
					body: JSON.stringify({
						email: options.email,
						token: options.token,
						type: options.type || "email",
					}),
				});

				const verifyResult = await verifyResponse.json();

				if (!verifyResponse.ok) {
					return {
						error: verifyResult.error || "Invalid OTP token",
						code: verifyResult.error,
						ok: false,
						status: verifyResponse.status,
					};
				}
			}

			// Step 2: Authenticate with Better Auth
			const result = await betterAuthSignIn.email({
				email: options.email,
				password: options.password,
			});

			if (result.error) {
				return {
					error: result.error.message || "Authentication failed",
					code: result.error.message,
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