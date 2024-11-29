import NextAuth, { Session } from "next-auth";
import authConfig from "./auth.config";
import { ExtendedUser } from "./types/next-auth";

export const {
	handlers: { GET, POST },
	auth,
	signIn,
	signOut,
} = NextAuth({
	pages: {
		signIn: "/login",
		signOut: "/sign-out",
		error: "/auth/error", // Error code passed in query string as ?error=
		verifyRequest: "/auth/verify-request", // (used for check email message)
		newUser: "/dashboard", // New users will be directed here on first sign in (leave the property out if not of interest)
	},
	session: {
		strategy: "jwt",
	},
	callbacks: {
		jwt: async ({ user, token, trigger }) => {
			if (trigger === "update") {
				return { ...token, ...user };
			}
			return { ...token, ...user };
		},
		session: async ({ session, token }: { session: Session, token: ExtendedUser }) => {
			// console.log('Session: ',session)
			// console.log('TOken: ',token)
			session.user = token
			return session;
		},
		signIn: async ({ account, profile, user, credentials }) => {
			return true;
		},
	},
	secret: process.env.AUTH_SECRET || "monstro@123",
	// debug: process.env.NODE_ENV === "production",

	...authConfig,
});
