import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Simple middleware without auth import to avoid edge runtime issues
// Auth checks will be done in individual pages/API routes

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ["/", "/auth/signin", "/auth/signup", "/api/auth"];

  const isPublicPath = publicPaths.some(
    (path) => pathname === path || pathname.startsWith("/api/auth")
  );

  // Allow public paths and static files
  if (isPublicPath) {
    return NextResponse.next();
  }

  // For protected routes, check for session token
  const token = request.cookies.get("authjs.session-token")?.value ||
                request.cookies.get("__Secure-authjs.session-token")?.value;

  if (!token && pathname.startsWith("/dashboard")) {
    const signInUrl = new URL("/auth/signin", request.url);
    signInUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(signInUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
