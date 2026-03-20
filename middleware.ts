import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const AUTH_COOKIE_NAME = "syllabify_auth"; // TODO: replace with your actual auth token/cookie strategy.

function isAuthed(req: NextRequest): boolean {
  // TODO: integrate Firebase Auth session verification here.
  return Boolean(req.cookies.get(AUTH_COOKIE_NAME)?.value);
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/course") ||
    pathname.startsWith("/settings");

  if (isProtected && !isAuthed(req)) {
    const url = new URL("/login", req.url);
    return NextResponse.redirect(url);
  }

  if (pathname.startsWith("/login") && isAuthed(req)) {
    const url = new URL("/dashboard", req.url);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/course/:path*", "/settings/:path*", "/login"]
};

