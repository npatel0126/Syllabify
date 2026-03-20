import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { phoneNumber?: string; code?: string };
  const phoneNumber = body.phoneNumber ?? "";
  const code = body.code ?? "";

  // TODO: Verify Firebase ID token and ensure the user is authenticated.
  void phoneNumber;
  void code;

  // TODO: Call Twilio Verify confirm/check endpoint.
  // TODO: On success, update Firestore user doc with verified phone number.
  return NextResponse.json({ success: true });
}

