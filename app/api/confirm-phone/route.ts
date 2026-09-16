import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken, adminDb } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/, "");
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let userId: string;
  try {
    const decoded = await verifyIdToken(idToken);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { phoneNumber?: string; code?: string };
  const phoneNumber = (body.phoneNumber ?? "").trim();
  const code = (body.code ?? "").trim();
  if (!phoneNumber || !code) {
    return NextResponse.json({ error: "Phone number and code required" }, { status: 400 });
  }

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!sid || !token || !serviceSid) {
    return NextResponse.json({ error: "SMS service not configured" }, { status: 503 });
  }

  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationCheck`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phoneNumber, Code: code }),
  });

  const json = await res.json().catch(() => ({})) as { status?: string };
  if (!res.ok || json.status !== "approved") {
    return NextResponse.json({ error: "Invalid or expired code" }, { status: 400 });
  }

  // Save verified phone to Firestore user doc
  await adminDb.collection("users").doc(userId).update({
    phone: phoneNumber,
    phoneVerified: true,
  });

  return NextResponse.json({ success: true });
}

