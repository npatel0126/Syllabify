import { NextRequest, NextResponse } from "next/server";
import { createSyllabus } from "@/lib/firebase/firestore";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

// POST /api/upload-syllabus
export async function POST(req: NextRequest) {
  try {
    const form = await req.formData();

    const file = form.get("file");
    const userId = form.get("userId");
    const courseName = (form.get("courseName") as string | null) ?? "Untitled Course";

    // ── Validate inputs ──────────────────────────────────────────────────────
    if (!userId || typeof userId !== "string") {
      return NextResponse.json({ error: "userId is required" }, { status: 400 });
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "A PDF file is required" }, { status: 400 });
    }

    if (file.type !== "application/pdf") {
      return NextResponse.json({ error: "Only PDF files are accepted" }, { status: 415 });
    }

    if (file.size > MAX_SIZE_BYTES) {
      return NextResponse.json({ error: "File exceeds the 20 MB limit" }, { status: 413 });
    }

    // ── Create Firestore record ───────────────────────────────────────────────
    const syllabusId = await createSyllabus({
      userId,
      courseName,
      professor: "",
      semester: "",
      pdfUrl: "",
      pineconeNamespace: `ns_${userId}_${Date.now()}`,
      status: "uploading",
    });

    return NextResponse.json({ syllabusId }, { status: 201 });
  } catch (err) {
    console.error("[upload-syllabus]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

