import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { phoneNumber?: string };
  const phoneNumber = body.phoneNumber ?? "";

  // TODO: Verify Firebase ID token and ensure the user is authenticated.
  void phoneNumber;

  // TODO: Call Twilio Verify API using TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN / TWILIO_VERIFY_SERVICE_SID.
  return NextResponse.json({ success: true });
}

