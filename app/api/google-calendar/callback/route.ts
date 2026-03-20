import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const state = url.searchParams.get("state") ?? "";
  void code;
  void state;

  // TODO: Verify Firebase ID token and user identity.
  // TODO: Exchange `code` for OAuth tokens via Google token endpoint.
  // TODO: Encrypt refresh token and store in Firestore user doc (`calendarToken`).

  return NextResponse.redirect(new URL("/settings", req.url));
}

