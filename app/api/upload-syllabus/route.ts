import { NextRequest, NextResponse } from "next/server";

// POST /api/upload-syllabus
// TODO: Verify Firebase ID token, upload to Firebase Storage, create Firestore doc.
export async function POST(req: NextRequest) {
  // TODO: Verify Authorization: Bearer <firebase id token> and extract uid.
  const authorization = req.headers.get("authorization") ?? "";
  void authorization;

  const form = await req.formData();
  const file = form.get("file");
  if (!file || !(file instanceof File)) {
    return NextResponse.json({ error: "PDF file is required" }, { status: 400 });
  }

  // TODO: Use `lib/firebase/storage.ts` uploadPDF + Firestore helpers.
  const syllabusId = `TODO-${Date.now()}`;

  return NextResponse.json({ syllabusId });
}

