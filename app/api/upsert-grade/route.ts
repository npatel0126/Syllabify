import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";
import { FieldValue } from "firebase-admin/firestore";

// POST /api/upsert-grade
// Body: { gradeId?, assignmentId, syllabusId, userId, scoreEarned, scoreMax, percentageScore, targetGrade }
// Creates or updates a grade doc via Admin SDK (bypasses Firestore security rules,
// which require auth.uid — the emulator doesn't have real auth).
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      gradeId,
      assignmentId,
      syllabusId,
      userId,
      scoreEarned,
      scoreMax,
      percentageScore,
      targetGrade,
    } = body as {
      gradeId?: string;
      assignmentId: string;
      syllabusId: string;
      userId: string;
      scoreEarned: number;
      scoreMax: number;
      percentageScore: number;
      targetGrade: string;
    };

    if (!assignmentId || !syllabusId || !userId) {
      return NextResponse.json({ error: "assignmentId, syllabusId, userId are required" }, { status: 400 });
    }

    const payload = {
      assignmentId,
      syllabusId,
      userId,
      scoreEarned,
      scoreMax,
      percentageScore,
      targetGrade,
      loggedAt: FieldValue.serverTimestamp(),
    };

    let resultId: string;

    if (gradeId) {
      await adminDb.collection("grades").doc(gradeId).set(payload, { merge: true });
      resultId = gradeId;
    } else {
      const ref = await adminDb.collection("grades").add(payload);
      resultId = ref.id;
    }

    return NextResponse.json({ gradeId: resultId }, { status: 200 });
  } catch (err) {
    console.error("[upsert-grade]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
