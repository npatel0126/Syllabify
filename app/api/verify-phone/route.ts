import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase/admin";

export async function POST(req: NextRequest) {
  // Auth check
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace(/^Bearer\s+/, "");
  if (!idToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  try {
    await verifyIdToken(idToken);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await req.json()) as { phoneNumber?: string };
  const phoneNumber = (body.phoneNumber ?? "").trim();
  if (!phoneNumber) return NextResponse.json({ error: "Phone number required" }, { status: 400 });

  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!sid || !token || !serviceSid) {
    return NextResponse.json({ error: "SMS service not configured" }, { status: 503 });
  }

  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${sid}:${token}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ To: phoneNumber, Channel: "sms" }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    console.error("Twilio verify error:", err);
    return NextResponse.json({ error: "Failed to send verification code" }, { status: 502 });
  }

  return NextResponse.json({ success: true });
}

