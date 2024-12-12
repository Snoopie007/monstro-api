import { NextResponse } from "next/server";
import { auth } from "./auth";
import { decodeId } from "./libs/server-utils";

export default auth(async (req) => {
  try {
    const { pathname } = req.nextUrl;
    const isLoggedin = !!req.auth;

    // Handle authentication for protected API routes
    if (pathname.startsWith("/api/protected") && !pathname.startsWith("/api/login")) {
      if (!isLoggedin) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const extractedUrl = pathname.match(/^\/api\/protected\/([^/]+)(\/.*)?$/);
      if (extractedUrl) {
        const [_, encodedId, subpath = ''] = extractedUrl;
        const decodedId = decodeId(encodedId);
        if (!decodedId) {
          return NextResponse.json({ message: "Invalid ID" }, { status: 400 });
        }
        return NextResponse.rewrite(new URL(`/api/protected/${decodedId}${subpath}`, req.url));
      }
    }

    // Handle non-API routes
    if (!isLoggedin && !pathname.startsWith("/auth") && !pathname.startsWith("/api/auth") && !pathname.startsWith("/clubs")) {
      const newUrl = new URL("/auth/login", req.nextUrl.origin);
      return NextResponse.redirect(newUrl);
    } else if (isLoggedin && pathname === "/") {
      const homeUrl = new URL(`/dashboard/${req.auth?.user.locations.length >= 1 ? req.auth?.user.locations[0].id : 'default'}`, req.nextUrl.origin);
      return NextResponse.redirect(homeUrl);
    }

    // Ensure no unintended caching for dynamic routes
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

