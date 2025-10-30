import { NextResponse } from "next/server"
import { auth } from "./auth"

const publicPaths = [
	"/login",
	"/join",
	"/callbacks",
	'/api/webhooks',
]

export default auth(async (req) => {

	try {
		const { pathname } = req.nextUrl
		const isLoggedin = !!req.auth
		const locations = req.auth?.user?.locations || []

		if (pathname.startsWith("/api/protected")) {
			if (!isLoggedin) {
				return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
			}
		}

		if (!isLoggedin) {

			if (pathname.startsWith("/api/auth") || publicPaths.some((path) => pathname.startsWith(path))) {
				return NextResponse.next()
			}

			const url = new URL("/login", req.nextUrl.origin)
			url.searchParams.set("callbackUrl", pathname)

			return NextResponse.redirect(url)
		}

		/* Handle home page and dashboard redirects (only for web, not for mobile) */
		if (isLoggedin) {

			if (pathname.startsWith("/api/") || pathname.startsWith("/callbacks")) {
				return NextResponse.next()
			}

			if (pathname === "/" || publicPaths.some((path) => pathname.startsWith(path))) {
				return NextResponse.redirect(new URL(`/dashboard/locations`, req.nextUrl.origin))
			}

			if (locations.length === 0 && pathname !== "/dashboard/locations/new") {
				return NextResponse.redirect(new URL("/dashboard/locations/new", req.nextUrl.origin))
			}

			const [_, locationId] = pathname.match(/^\/dashboard\/location\/([^/]+)(\/.*)?$/) || []

			if (locationId) {

				const next = locations.find((loc: { id: string }) => loc.id === locationId)

				if (!next) {
					return NextResponse.redirect(new URL("/dashboard/locations", req.nextUrl.origin))
				}

				if (!["active", "incomplete"].includes(next.status) && !pathname.startsWith(`/dashboard/location/${next.id}`)) {
					return NextResponse.redirect(new URL(`/dashboard/location/${next.id}`, req.nextUrl.origin))
				}
			}
		}
	} catch (error) {
		console.error("Middleware error:", error)
		return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
	}
})

export const config = {
	matcher: ["/((?!sign-in|_next/static|_next/image|images|favicon.ico).*)"],
}