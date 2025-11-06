import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = ["/login", "/join", "/callbacks", "/api/webhooks"];

export default async function middleware(req: NextRequest) {
  try {
    const { pathname } = new URL(req.url);
    
    // Check if session cookie exists (no DB access needed)
    const sessionCookie = req.cookies.get("monstro.session_token");
    const isLoggedIn = !!sessionCookie;
    
    // Protected API routes
    if (pathname.startsWith("/api/protected")) {
      if (!isLoggedIn) {
        return NextResponse.json(
          { message: "Unauthorized" }, 
          { status: 401 }
        );
      }
    }
    
    // Unauthenticated user redirects
    if (!isLoggedIn) {
      if (
        pathname.startsWith("/api/auth") ||
        publicPaths.some((path) => pathname.startsWith(path))
      ) {
        return NextResponse.next();
      }
      
      const url = new URL("/login", req.url);
      url.searchParams.set("callbackUrl", pathname);
      return NextResponse.redirect(url);
    }
    
    // Authenticated user redirects
    if (isLoggedIn) {
      if (
        pathname.startsWith("/api/") || 
        pathname.startsWith("/callbacks")
      ) {
        return NextResponse.next();
      }
      
      if (
        pathname === "/" || 
        publicPaths.some((path) => pathname.startsWith(path))
      ) {
        return NextResponse.redirect(
          new URL("/dashboard/locations", req.url)
        );
      }
      
      // NOTE: Location-based access control requires DB access
      // Move this logic to page-level or API route checks instead
    }
    
    return NextResponse.next();
  } catch (error) {
    console.error("Middleware error:", error);
    return NextResponse.json(
      { message: "Internal Server Error" }, 
      { status: 500 }
    );
  }
}

export const config = {
  matcher: ["/((?!sign-in|_next/static|_next/image|images|favicon.ico).*)"],
};