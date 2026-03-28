import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// DELETE /api/delete-assignment
// Body: { assignmentId: string }
export async function DELETE(req: NextRequest) {
  try {
    const { assignmentId } = await req.json() as { assignmentId?: string };

    if (!assignmentId) {
      return NextResponse.json({ error: "assignmentId is required" }, { status: 400 });
    }

    // Delete the assignment doc
    await adminDb.collection("assignments").doc(assignmentId).delete();

    // Delete any grades linked to this assignment
    const gradeSnap = await adminDb.collection("grades")
      .where("assignmentId", "==", assignmentId)
      .get();

    if (!gradeSnap.empty) {
      const batch = adminDb.batch();
      gradeSnap.docs.forEach((d) => batch.delete(d.ref));
      await batch.commit();
    }

    return NextResponse.json({ ok: true }, { status: 200 });
  } catch (err) {
    console.error("[delete-assignment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
