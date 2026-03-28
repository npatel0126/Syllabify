import { NextRequest, NextResponse } from "next/server";
import { adminDb } from "@/lib/firebase/admin";

// POST /api/add-assignment
// Body: Assignment fields minus assignmentId
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { syllabusId, userId, title, type, gradeWeight, notes, isCustom,
            dueDate, dueDateConfirmed, calendarEventId, reminderTaskIds } = body;

    if (!syllabusId || !userId || !title) {
      return NextResponse.json({ error: "syllabusId, userId, title are required" }, { status: 400 });
    }

    const ref = await adminDb.collection("assignments").add({
      syllabusId,
      userId,
      title,
      type: type ?? "homework",
      gradeWeight: gradeWeight ?? 0,
      notes: notes ?? "",
      isCustom: isCustom ?? false,
      dueDate: dueDate ?? null,
      dueDateConfirmed: dueDateConfirmed ?? false,
      calendarEventId: calendarEventId ?? "",
      reminderTaskIds: reminderTaskIds ?? [],
    });

    return NextResponse.json({ assignmentId: ref.id }, { status: 201 });
  } catch (err) {
    console.error("[add-assignment]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
