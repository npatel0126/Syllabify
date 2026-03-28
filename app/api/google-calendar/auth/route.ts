import { NextRequest, NextResponse } from "next/server";
import { adminAuth } from "@/lib/firebase/admin";

const SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

/**
 * GET /api/google-calendar/auth?token=<firebase-id-token>
 * Verifies the Firebase ID token then redirects to Google's OAuth consent page.
 * The Firebase UID is stored in `state` so the callback can identify the user.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const idToken = searchParams.get("token") ?? "";

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const clientId = process.env.GOOGLE_CLIENT_ID ?? "";
  const redirectUri = process.env.GOOGLE_REDIRECT_URI ?? "";

  if (!clientId || clientId.includes("placeholder") || !redirectUri) {
    return NextResponse.json(
      { error: "Google OAuth not configured — set GOOGLE_CLIENT_ID and GOOGLE_REDIRECT_URI in .env.local" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: "code",
    scope: SCOPES,
    access_type: "offline",
    prompt: "consent",
    state: uid,
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}

