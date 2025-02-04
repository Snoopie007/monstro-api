import { NextResponse } from "next/server";
import { auth } from "./auth";
import { decodeId } from "./libs/server-utils";
const publicPaths = ['/auth', '/api/auth', '/join', '/clubs', '/api/webhooks'];

export default auth(async (req) => {

	try {
		const { pathname } = req.nextUrl;
		const isLoggedin = !!req.auth;

		// Handle protected API routes
		if (pathname.startsWith("/api/protected")) {
			if (!isLoggedin) {
				return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
			}

			const match = pathname.match(/^\/api\/protected\/([^/]+)(\/.*)?$/);
			if (match) {
				const [_, encodedId, subpath = ''] = match;
				if (!isNaN(Number(encodedId))) {
					return NextResponse.next();
				}

				const decodedId = decodeId(encodedId);
				if (!decodedId) {
					return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
				}

				return NextResponse.rewrite(new URL(`/api/protected/${decodedId}${subpath}`, req.url));
			}
		}

		// Handle public routes

		if (!isLoggedin && !publicPaths.some(path => pathname.startsWith(path))) {
			return NextResponse.redirect(new URL("/auth/login", req.nextUrl.origin));
		}

		// Redirect logged in users from home page
		if (isLoggedin && pathname === "/") {
			const defaultLocation = req.auth?.user.locations[0]?.id || 'default';
			return NextResponse.redirect(new URL(`/dashboard/${defaultLocation}`, req.nextUrl.origin));
		}

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
