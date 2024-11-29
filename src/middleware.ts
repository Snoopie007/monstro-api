import { NextResponse } from "next/server";
import { auth } from "./auth";
import { decodeId } from "./libs/server-utils";

// const ProtectedAPI = [
// 	"/api/",
// ];

export default auth(async (req) => {
	const { pathname } = req.nextUrl;

	const isLoggedin = !!req.auth;
	// const isAdmin = req.auth?.user.role === "Admin";
	// const isVendor = req.auth?.user.role === "vendor";
	// Handle authentication for protected API routes
	if (pathname.startsWith("/api/protected") && (!pathname.startsWith("/api/login"))) {
		if (!isLoggedin) {
			return Response.json({ message: "Unauthorized" }, { status: 401 });
		}

		// if (ProtectedAPI.includes(pathname)) {
		// 	if (isAdmin) {
		// 		return NextResponse.next();
		// 	}
		// 	let authorization = req.headers.get("Authorization");

		// 	if (!authorization) {
		// 		return Response.json({ message: "Unauthorized" }, { status: 401 });
		// 	}
		// }

		const extractedUrl = pathname.match(/^\/api\/protected\/([^/]+)(\/.*)?$/);
		if (extractedUrl) {
			const [_, encodedId, subpath = ''] = extractedUrl;
			const decodedId = decodeId(encodedId);
			return NextResponse.rewrite(new URL(`/api/protected/${decodedId}${subpath}`, req.url));
		}

		return NextResponse.next();
	}
	// Handle non-API routes
	if (!isLoggedin && !pathname.startsWith("/auth") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/clubs")) {
		const newUrl = new URL("/auth/login", req.nextUrl.origin)
		return Response.redirect(newUrl)
	}


	else if (isLoggedin && pathname === "/") {
		// Redirect logged-in users to the home route when they access the base route
		const homeUrl = new URL(`/dashboard/${req.auth?.user.locations.length >= 1 ? req.auth?.user.locations[0].id : null}`, req.nextUrl.origin);  // Adjust this to your desired route
		return Response.redirect(homeUrl);
	}

	return NextResponse.next();
});

export const config = {
	matcher: [
		"/((?!sign-in|_next/static|_next/image|images|favicon.ico).*)",
	],
};
