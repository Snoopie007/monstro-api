import { NextResponse } from "next/server"
import { auth } from "./auth"
import { jwtVerify } from "jose";

const publicPaths = [
	"/login",
	"/join",
	"/callbacks",
	'/api/webhooks',
]

async function verifyToken(token: string): Promise<boolean> {
	try {
		const secret = new TextEncoder().encode(process.env.AUTH_SECRET);
		await jwtVerify(token, secret);
		return true
	} catch (error) {
		console.log(error);
		return false
	}
}

export default auth(async (req) => {

	try {
		const { pathname, searchParams } = req.nextUrl
		const isLoggedin = !!req.auth
		const locations = req.auth?.user?.locations || []

		/* Check for mobile app requests */
		const isMobileApp = req.headers.get("X-Mobile-App") === "true" && pathname.startsWith("/api/protected/mobile")

		/* Verify mobile app token */
		let isMobileAuthenticated = false
		if (isMobileApp) {
			const token = req.headers.get("Authorization")?.split(" ")[1]
			if (token) {
				isMobileAuthenticated = await verifyToken(token)
				if (isMobileAuthenticated) {
					return NextResponse.next()
				} else {
					return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
				}
			}
		}

		if (pathname.startsWith("/api/protected")) {
			if (!isLoggedin && !isMobileAuthenticated) {
				return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
			}
		}

		/* Handle authentication redirects */
		if (!isLoggedin) {

			if (pathname.startsWith("/api/auth") || publicPaths.some((path) => pathname.startsWith(path))) {

				return NextResponse.next()
			}

			const url = new URL("/login", req.nextUrl.origin)
			url.searchParams.set("callbackUrl", pathname)
			return NextResponse.redirect(url)
		}

		/* Handle home page and dashboard redirects (only for web, not for mobile) */
		if (isLoggedin && !isMobileApp) {

			if (pathname.startsWith("/api/") || pathname.startsWith("/callbacks")) {
				return NextResponse.next()
			}

			/* Redirect to Dashboard if no locations */
			if (pathname === "/" || publicPaths.some((path) => pathname.startsWith(path))) {
				return NextResponse.redirect(new URL(`/dashboard/locations`, req.nextUrl.origin))
			}

			/* No Locations Redirect to New Location */
			if (locations.length === 0 && pathname !== "/dashboard/locations/new") {
				return NextResponse.redirect(new URL("/dashboard/locations/new", req.nextUrl.origin))
			}

			const [_, locationId, path] = pathname.match(/^\/dashboard\/location\/([^/]+)(\/.*)?$/) || []

			if (locationId) {
				/* Check if locationId is a valid location */
				const next = locations.find((loc: { id: string }) => loc.id === locationId)

				if (!next) {
					return NextResponse.redirect(new URL("/dashboard/locations", req.nextUrl.origin))
				}


				if (!["active", "incomplete"].includes(next.status) && pathname !== `/dashboard/location/${next.id}`) {
					return NextResponse.redirect(new URL(`/dashboard/location/${next.id}`, req.nextUrl.origin))
				}

				return NextResponse.next()
			}
		}

		/* Set cache headers for API and dashboard routes */
		const response = NextResponse.next()
		if (pathname.startsWith("/api/") || pathname.startsWith("/dashboard/")) {
			response.headers.set("Cache-Control", "no-store, max-age=0")
		}
		return response
	} catch (error) {
		console.error("Middleware error:", error)
		return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
	}
})

export const config = {
	matcher: ["/((?!sign-in|_next/static|_next/image|images|favicon.ico).*)"],
}