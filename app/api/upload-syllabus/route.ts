import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/upload-syllabus
// Body (JSON): { userId: string, courseName?: string }
// Returns:     { syllabusId: string }
//
// The client uploads the PDF directly to Firebase Storage using the returned
// syllabusId as the filename, then calls updateSyllabus() with the download URL.
// This keeps large binary data out of the Next.js API layer entirely.
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { userId, courseName = "Untitled Course" } = body as {
      userId?: string;
      courseName?: string;
    };

    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    // ── Create Firestore record via Admin SDK (bypasses security rules) ──────
    const now = FieldValue.serverTimestamp();
    const docRef = await adminDb.collection("syllabi").add({
      userId,
      courseName,
      professor: "",
      semester: "",
      pdfUrl: "",
      pineconeNamespace: `ns_${userId}_${Date.now()}`,
      status: "uploading",
      createdAt: now,
      updatedAt: now,
    });
    const syllabusId = docRef.id;

    return NextResponse.json({ syllabusId }, { status: 201 });
  } catch (err) {
    console.error("[upload-syllabus]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

