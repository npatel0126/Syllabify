import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  void authorization;

  // TODO: Verify Firebase ID token and extract uid.
  // TODO: Call Firebase Cloud Function `delete_account` (HTTPS callable) or implement the purge directly here.

  return NextResponse.json({ success: true });
}

