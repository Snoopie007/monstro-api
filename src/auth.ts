import NextAuth, { Session } from "next-auth";
import authConfig from "./auth.config";
import { ExtendedUser } from "./types/next-auth";
import { Location } from "./types/location";

async function checkAndUpdateLocation(locations: Location[], currentLocationId: number) {
	try {
		const currentLocation = locations.find((location: Location) => location.id === currentLocationId);
		if (!currentLocation?.progress.lastRenewalDate) return locations;

		const lastRenewal = new Date(currentLocation.progress.lastRenewalDate);
		const fourWeeksLater = new Date(lastRenewal.getTime() + 28 * 24 * 60 * 60 * 1000);

		if (new Date() < fourWeeksLater) return locations;

		const res = await fetch(`${process.env.AUTH_URL}api/location/${currentLocationId}`);
		if (!res.ok) return locations;

		const data = await res.json();
		const index = locations.findIndex(loc => loc.id === currentLocationId);
		locations[index] = { ...locations[index], ...data };
		return locations;

	} catch (error) {
		console.log("Error checking for location update");
		return locations;
	}
}

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
		newUser: "/onboarding"
	},
	session: {
		strategy: "jwt",
	},
	callbacks: {
		jwt: async ({ user, token, session, trigger }) => {
			if (trigger === "update") {
				return { ...token, ...session };
			}
			if (token.currentLocationId) {
				const locations = await checkAndUpdateLocation(token.locations as Location[], token.currentLocationId as number);
				token.locations = locations;
			}
			return { ...token, ...user };
		},
		session: async ({ session, token }: { session: Session, token: ExtendedUser }) => {
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
