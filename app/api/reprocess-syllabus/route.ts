import { NextRequest, NextResponse } from "next/server";
import { adminAuth, adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";
import { getStorage } from "firebase-admin/storage";

// POST /api/reprocess-syllabus
// Header: Authorization: Bearer <idToken>
// Body:   { syllabusId: string }
//
// Re-triggers AI extraction on an already-uploaded syllabus by copying the
// stored PDF over itself in Firebase Storage, causing on_object_finalized
// to fire again in the Cloud Function.
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const token = (req.headers.get("authorization") ?? "").replace("Bearer ", "");
  let userId: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { syllabusId } = (await req.json()) as { syllabusId?: string };
  if (!syllabusId) {
    return NextResponse.json({ error: "syllabusId is required" }, { status: 400 });
  }

  // ── Verify ownership ──────────────────────────────────────────────────────
  const snap = await adminDb.collection("syllabi").doc(syllabusId).get();
  if (!snap.exists || snap.data()?.userId !== userId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const data = snap.data()!;
  const storagePath: string = data.storagePath ?? `users/${userId}/syllabi/${syllabusId}.pdf`;

  try {
    const bucket = getStorage().bucket();
    const src = bucket.file(storagePath);

    // Check the file actually exists
    const [exists] = await src.exists();
    if (!exists) {
      return NextResponse.json(
        { error: "PDF not found in Storage — please re-upload the file." },
        { status: 422 }
      );
    }

    // Copy the blob to a temp path, then back. This creates a new finalize event.
    const tmpPath = `${storagePath}.reprocess_tmp`;
    await src.copy(tmpPath);
    await bucket.file(tmpPath).copy(storagePath);          // ← fires on_object_finalized
    await bucket.file(tmpPath).delete().catch(() => {});   // clean up temp

    // Reset status so UI shows "processing"
    await adminDb.collection("syllabi").doc(syllabusId).update({
      status: "processing",
      updatedAt: FieldValue.serverTimestamp(),
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[reprocess-syllabus]", err);
    return NextResponse.json({ error: "Failed to re-trigger processing." }, { status: 500 });
  }
}
