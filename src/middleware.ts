import { NextResponse } from "next/server";
import { auth } from "@/libs/auth";

const publicPaths = ["/login", "/join", "/callbacks", "/api/webhooks"];

export default async function middleware(req: Request) {
  try {
    const { pathname } = new URL(req.url);
    
    // Get session from Better Auth
    const session = await auth.api.getSession({ 
      headers: req.headers 
    });
    
    const isLoggedIn = !!session;
    
    // Access user data (enriched by after hook)
    const locations = session?.user?.locations || [];
    
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
      
      // Location-based access control
      if (locations.length === 0 && pathname !== "/dashboard/locations/new") {
        return NextResponse.redirect(
          new URL("/dashboard/locations/new", req.url)
        );
      }
      
      const [_, locationId] = pathname.match(
        /^\/dashboard\/location\/([^/]+)(\/.*)?$/
      ) || [];
      
      if (locationId) {
        const location = locations.find((loc: any) => loc.id === locationId);
        
        if (!location) {
          return NextResponse.redirect(
            new URL("/dashboard/locations", req.url)
          );
        }
        
        if (
          !["active", "incomplete"].includes(location.status) &&
          !pathname.startsWith(`/dashboard/location/${location.id}`)
        ) {
          return NextResponse.redirect(
            new URL(`/dashboard/location/${location.id}`, req.url)
          );
        }
      }
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