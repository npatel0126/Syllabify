import { NextRequest, NextResponse } from "next/server";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/utils/crypto";

/**
 * POST /api/google-calendar/disconnect   (auth via Bearer token)
 * Revokes the OAuth token with Google, clears calendarToken + calendarConnected
 * from the user's Firestore doc.
 */
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace("Bearer ", "").trim();

  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userSnap = await adminDb.collection("users").doc(uid).get();
  const encryptedToken: string | undefined = (userSnap.data() ?? {}).calendarToken;

  if (encryptedToken) {
    try {
      const refreshToken = decrypt(encryptedToken);
      // Revoke the token with Google so it can't be reused
      await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(refreshToken)}`, {
        method: "POST",
      });
    } catch (err) {
      // Non-fatal — continue with Firestore cleanup regardless
      console.warn("[calendar/disconnect] token revocation failed:", err);
    }
  }

  await adminDb.collection("users").doc(uid).set(
    { calendarToken: null, calendarConnected: false },
    { merge: true }
  );

  return NextResponse.json({ ok: true });
}
