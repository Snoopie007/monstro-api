import { NextResponse } from "next/server";
import { auth } from "./auth";
import { decodeId } from "./libs/server/sqids";

const publicPaths = ['/login', '/api/auth', '/join', '/api/webhooks'];

export default auth(async (req) => {
	try {
		const { pathname } = req.nextUrl;
		const isLoggedin = !!req.auth;
		const locations = req.auth?.user?.locations || [];
		const onboarding = req.auth?.user?.onboarding;
		// Handle protected API routes
		if (pathname.startsWith("/api/protected")) {
			if (!isLoggedin) {
				return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
			}

			const [_, encodedId, subpath = ''] = pathname.match(/^\/api\/protected\/([^/]+)(\/.*)?$/) || [];

			if (!encodedId || !isNaN(Number(encodedId)) || encodedId.startsWith("vendor")) {
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

		// Handle home page redirect for logged in users
		if (isLoggedin && pathname === "/" && locations.length > 0) {
			const url = onboarding.completed ? `/dashboard/${locations[0].id}` : `/onboarding`
			return NextResponse.redirect(new URL(url, req.nextUrl.origin));
		}

		// Handle dashboard access
		const [_, dashboardId] = pathname.match(/^\/dashboard\/([^/]+)/) || [];
		if (dashboardId && !locations.some((loc: { id: string }) => loc.id === dashboardId)) {
			return NextResponse.redirect(new URL("/dashboard", req.nextUrl.origin));
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
