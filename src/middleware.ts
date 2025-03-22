import { NextResponse } from "next/server"
import { auth } from "./auth"
import { decodeId } from "./libs/server/sqids"
import { jwtVerify } from "jose";

const publicPaths = ["/login", "/api/auth", "/api/location", "/join", "/api/webhooks"]

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
		if (
			!isLoggedin &&
			!(isMobileApp && isMobileAuthenticated) &&
			!publicPaths.some((path) => pathname.startsWith(path))
		) {
			if (pathname.startsWith("/api/location")) {
				// Need a token to check traffic source?
				return NextResponse.next()
			}
			return NextResponse.redirect(new URL("/login", req.nextUrl.origin))
		}

		// Handle home page and dashboard redirects (only for web, not for mobile)
		if (isLoggedin && !isMobileApp) {


			if (pathname.startsWith("/api/")) {
				return NextResponse.next()
			}

			if (locations.length === 0 && pathname !== "/onboarding") {
				return NextResponse.redirect(new URL("/onboarding", req.nextUrl.origin))
			}

			if (pathname === "/" || publicPaths.includes(pathname)) {
				const next = locations.find((loc: { status: string }) => loc.status === "active") || locations.find((loc: { status: string }) => loc.status === "incomplete")
				return NextResponse.redirect(new URL(`/${next.status === "active" ? "dashboard" : "onboarding"}/${next.id}`, req.nextUrl.origin))
			}


			const [, path, locationId] = pathname.match(/^\/((?:dashboard|onboarding))\/([^/]+)(\/.*)?$/) || []

			if (locationId) {
				/** Check if locationId is a valid location */
				let nextLocation = locations.find((loc: { id: string }) => loc.id === locationId)

				/** If locationId is not a valid location, redirect to the first active location */
				if (!nextLocation) {
					nextLocation =
						locations.find((loc: { status: string }) => loc.status === "active") ||
						locations.find((loc: { status: string }) => loc.status === "incomplete")
				}

				/** If the path is not allowed for the current location, redirect to the dashboard of the next location */
				const allowedInactivePaths = [`/dashboard/${nextLocation.id}`, `/dashboard/${nextLocation.id}/settings/billing`]
				if (
					path.startsWith("dashboard") &&
					!allowedInactivePaths.includes(pathname) &&
					!["active", "incomplete"].includes(nextLocation.status)
				) {
					return NextResponse.redirect(new URL(`/dashboard/${nextLocation.id}`, req.nextUrl.origin))
				}

				const isOnboarding = nextLocation.status === "incomplete"
				const targetPath = isOnboarding ? "onboarding" : "dashboard"

				if (path !== targetPath) {
					return NextResponse.redirect(new URL(`/${targetPath}/${nextLocation.id}`, req.nextUrl.origin))
				}
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
