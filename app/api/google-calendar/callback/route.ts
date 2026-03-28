import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { encrypt } from "@/lib/utils/crypto";

/**
 * GET /api/google-calendar/callback?code=...&state=<uid>
 * Exchanges the auth code for tokens, encrypts the refresh token, and stores
 * it in users/{uid}.calendarToken. Then redirects back to settings.
 */
export async function GET(req: NextRequest) {
  const url = new URL(req.url);
  const code = url.searchParams.get("code") ?? "";
  const uid  = url.searchParams.get("state") ?? "";
  const error = url.searchParams.get("error");

  // User denied consent
  if (error || !code || !uid) {
    return NextResponse.redirect(new URL("/settings?calendar=denied", req.url));
  }

  const clientId     = process.env.GOOGLE_CLIENT_ID ?? "";
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET ?? "";
  const redirectUri  = process.env.GOOGLE_REDIRECT_URI ?? "";

  try {
    // Exchange code → tokens
    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }),
    });

    if (!tokenRes.ok) {
      const msg = await tokenRes.text();
      console.error("[calendar/callback] token exchange failed:", msg);
      return NextResponse.redirect(new URL("/settings?calendar=error", req.url));
    }

    const { refresh_token, access_token } = await tokenRes.json() as {
      refresh_token?: string;
      access_token?: string;
    };

    if (!refresh_token) {
      // Can happen if the user previously granted access — revoke in Google and retry
      console.error("[calendar/callback] no refresh_token in response");
      return NextResponse.redirect(new URL("/settings?calendar=no_refresh", req.url));
    }

    // Encrypt and persist to Firestore
    const encrypted = encrypt(refresh_token);
    await adminDb.collection("users").doc(uid).set(
      { calendarToken: encrypted, calendarConnected: true },
      { merge: true }
    );

    void access_token; // not stored — obtained fresh each sync via refresh token
    return NextResponse.redirect(new URL("/settings?calendar=connected", req.url));
  } catch (err) {
    console.error("[calendar/callback] unexpected error:", err);
    return NextResponse.redirect(new URL("/settings?calendar=error", req.url));
  }
}

