import { NextRequest, NextResponse } from "next/server";

// TODO: Integrate with Firebase Auth session/JWT verification.
// This middleware is a placeholder scaffolding for route protection.
export function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  const isPublicAuthRoute =
    pathname.startsWith("/login") || pathname.includes("/(auth)/login");
  const isPublicPage =
    pathname === "/" ||
    pathname.startsWith("/api/google-calendar") ||
    pathname.includes("/(auth)/onboarding");

  // Basic guard placeholder (unauthenticated users are redirected).
  // TODO: Replace with real auth checks.
  const fakeIsAuthenticated = false;

  if (!fakeIsAuthenticated) {
    if (pathname.startsWith("/dashboard") || pathname.includes("/course/") || pathname.includes("/settings")) {
      const url = new URL("/login", req.url);
      return NextResponse.redirect(url);
    }
    if (pathname === "/login" || isPublicAuthRoute || isPublicPage) {
      return NextResponse.next();
    }
  }

  // If authenticated and trying to visit login, redirect to dashboard.
  if (fakeIsAuthenticated) {
    if (pathname === "/login" || isPublicAuthRoute) {
      const url = new URL("/dashboard", req.url);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/course/:path*", "/settings/:path*", "/login"]
};

