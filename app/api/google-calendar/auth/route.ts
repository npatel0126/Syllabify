import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  // TODO: Verify Firebase ID token, build OAuth consent URL using GOOGLE_CLIENT_ID/SECRET.
  const googleOAuthUrl = "https://accounts.google.com/o/oauth2/v2/auth";

  return NextResponse.redirect(googleOAuthUrl);
}

