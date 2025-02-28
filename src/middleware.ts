import { NextResponse } from "next/server";
import { auth } from "./auth";
import { decodeId } from "./libs/server/sqids";

const publicPaths = ['/login', '/api/auth', '/api/location', '/join', '/api/webhooks'];

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
			if (pathname.startsWith("/api/location")) {
				// Need a token to check traffic source?
				return NextResponse.next();
			}
			return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
		}

		// Handle home page and dashboard redirects
		if (isLoggedin) {

			if (locations.length === 0 && pathname !== '/onboarding') {
				return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin));
			}

			if (pathname === '/') {
				const nextLocation = locations.find((loc: { status: string }) => loc.status === "Active") ||
					locations.find((loc: { status: string }) => loc.status === "Pending");
				return NextResponse.redirect(new URL(`/${nextLocation.status === "Active" ? "dashboard" : "onboarding"}/${nextLocation.id}`, req.nextUrl.origin));
			}

			const [_, path, locationId] = pathname.match(/^\/((?:dashboard|onboarding))\/([^/]+)(\/.*)?$/) || [];

			if (locationId) {
				let nextLocation = locations.find((loc: { id: string }) => loc.id === locationId)

				if (!nextLocation) {
					nextLocation = locations.find((loc: { status: string }) => loc.status === "Active") ||
						locations.find((loc: { status: string }) => loc.status === "Pending");
				}
				const allowedInactivePaths = [`/dashboard/${nextLocation.id}`, `/dashboard/${nextLocation.id}/settings/billing`]
				if (path.startsWith('dashboard') && !allowedInactivePaths.includes(pathname) && !['Pending', 'Active'].includes(nextLocation.status)) {

					return NextResponse.redirect(new URL(`/dashboard/${nextLocation.id}`, req.nextUrl.origin));
				}

				const isOnboarding = nextLocation.status === 'Pending';
				const targetPath = isOnboarding ? 'onboarding' : 'dashboard';



				if (path !== targetPath) {
					console.log(`a`)
					return NextResponse.redirect(new URL(`/${targetPath}/${nextLocation.id}`, req.nextUrl.origin));
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


function getNextLocation(locations: { id: string, status: string }[], locationId: string) {
	const nextLocation = locations.find((loc: { id: string }) => loc.id === locationId)

	if (!nextLocation) {
		return locations.find((loc: { status: string }) => loc.status === "Active") ||
			locations.find((loc: { status: string }) => loc.status === "Pending");
	}
	return nextLocation
}

export const config = {
	matcher: [
		"/((?!sign-in|_next/static|_next/image|images|favicon.ico).*)",
	],
};
