import { NextResponse } from "next/server";
import { auth } from "./auth";
import { decodeId } from "./libs/server/sqids";

const publicPaths = ['/login', '/api/auth', '/join', '/api/webhooks'];

export default auth(async (req) => {
	try {
		const { pathname } = req.nextUrl;
		const isLoggedin = !!req.auth;
		const locations = req.auth?.user?.locations || [];

		if (pathname.startsWith("/api/protected")) {
			if (!isLoggedin) {
				return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
			}

			const [_, encodedId, subpath = ''] = pathname.match(/^\/api\/protected\/([^/]+)(\/.*)?$/) || [];

			if (!encodedId || !isNaN(Number(encodedId)) || encodedId.startsWith("onboarding")) {
				return NextResponse.next();
			}

			const decodedId = decodeId(encodedId);
			return decodedId
				? NextResponse.rewrite(new URL(`/api/protected/${decodedId}${subpath}`, req.url))
				: NextResponse.json({ message: "Invalid location" }, { status: 400 });
		}

		// Handle authentication redirects
		if (!isLoggedin && !publicPaths.some(path => pathname.startsWith(path))) {
			return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
		}

		// Handle home page and dashboard redirects
		if (isLoggedin) {

			if (locations.length === 0) {
				console.log("No locations found");
				return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
			}

			const activeLocation = locations.find((loc: { status: string }) => loc.status === "Active");
			if (pathname === "/") {

				const pendingLocation = locations.find((loc: { status: string }) => loc.status === "Pending");
				const redirectPath = activeLocation
					? `/dashboard/${activeLocation.id}`
					: pendingLocation
						? `/onboarding/${pendingLocation.id}`
						: "/dashboard";
				return NextResponse.redirect(new URL(redirectPath, req.nextUrl.origin));
			}


			if (pathname.match(/^\/dashboard\/[^/]+$/)) {
				const currentLocation = locations.find((loc: { id: string }) => loc.id === pathname.split('/')[2]);
				console.log(currentLocation)
				if (!currentLocation) {
					return NextResponse.redirect(new URL(activeLocation ? `/dashboard/${activeLocation.id}` : '/dashboard', req.nextUrl.origin));
				}

				if (currentLocation.status === 'Pending') {
					return NextResponse.redirect(new URL(`/onboarding/${currentLocation.id}`, req.nextUrl.origin));
				}
			}

		}

		// Set cache headers for API and dashboard routes
		const response = NextResponse.next();
		if (pathname.startsWith("/api/") || pathname.startsWith("/dashboard/")) {
			response.headers.set('Cache-Control', 'no-store, max-age=0');
		}
		return response;

	} catch (error) {
		console.error("Middleware error:", error);
		return NextResponse.json({ message: "Internal Server Error" }, { status: 500 });
	}
});

export const config = {
	matcher: [
		"/((?!sign-in|_next/static|_next/image|images|favicon.ico).*)",
	],
};
