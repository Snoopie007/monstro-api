import { NextResponse } from "next/server"
import { auth } from "./auth"
import { decodeId } from "./libs/server/sqids"
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/api/auth", "/join", "/api/webhooks"]

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
		const { pathname } = req.nextUrl
		const isLoggedin = !!req.auth
		const locations = req.auth?.user?.locations || []

		// Check for mobile app requests
		const isMobileApp = req.headers.get("X-Mobile-App") === "true" && pathname.includes("mobile")
		// Verify mobile app token
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

		if (pathname.startsWith("/api/protected/loc")) {
			if (!isLoggedin && !(isMobileApp && isMobileAuthenticated)) {
				return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
			}

			const [, encodedId, subpath = ""] = pathname.match(/^\/api\/protected\/loc\/([^/]+)(\/.*)?$/) || []

			if (!encodedId || !isNaN(Number(encodedId))) {
				return NextResponse.next()
			}

			const decodedId = decodeId(encodedId)
			return decodedId
				? NextResponse.rewrite(new URL(`/api/protected/loc/${decodedId}${subpath}`, req.url))
				: NextResponse.json({ message: "Invalid location" }, { status: 400 })
		}

		// Handle authentication redirects
		if (!isLoggedin && !(isMobileApp && isMobileAuthenticated) && !publicPaths.some((path) => pathname.startsWith(path))) {
			// Need a token to check traffic source?
			// if (pathname.startsWith("/api/public")) {

			// 	return NextResponse.next()
			// }
			return NextResponse.redirect(new URL("/login", req.nextUrl.origin))
		}

		// Handle home page and dashboard redirects (only for web, not for mobile)
		if (isLoggedin && !isMobileApp) {


			if (pathname.startsWith("/api/")) {
				return NextResponse.next()
			}

			const NewLocationPath = "/dashboard/locations/new";

			if (locations.length === 0 && pathname !== NewLocationPath) {
				return NextResponse.redirect(new URL(NewLocationPath, req.nextUrl.origin))
			}

			if (pathname === "/" || publicPaths.includes(pathname)) {
				return NextResponse.redirect(new URL(`/dashboard/locations`, req.nextUrl.origin))
			}

			const [, path, locationId] = pathname.match(/^\/((?:dashboard\/location|dashboard\/locations\/new))\/([^/]+)(\/.*)?$/) || []

			if (locationId) {
				/** Check if locationId is a valid location */
				const next = locations.find((loc: { id: string }) => loc.id === locationId)

				if (!next) {
					return NextResponse.redirect(new URL("/dashboard/locations", req.nextUrl.origin))
				}

				/** If the path is not allowed for the current location, redirect to the dashboard of the next location */
				const allowedInactivePaths = [`/dashboard/location/${next.id}/suspended`]
				if (!["active", "incomplete"].includes(next.status) && !allowedInactivePaths.includes(path)) {
					return NextResponse.redirect(new URL(`/dashboard/location/${next.id}/suspended`, req.nextUrl.origin))
				}

				return NextResponse.next()

				// const isOnboarding = next.status === "incomplete"
				// const targetPath = isOnboarding ? NewLocationPath : "dashboard/location"

				// if (path !== targetPath) {
				// 	return NextResponse.redirect(new URL(`/${targetPath}/${next.id}`, req.nextUrl.origin))
				// }
			}
		}

		// Set cache headers for API and dashboard routes
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
