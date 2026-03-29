import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { adminDb, adminAuth } from "@/lib/firebase/admin";
import { decrypt } from "@/lib/utils/crypto";

/**
 * POST /api/google-calendar/sync
 * Body: { assignmentId, syllabusId }   (auth via Bearer token)
 *
 * Reads the assignment from Firestore, creates (or updates) a Google Calendar
 * event, and writes the returned eventId back to the assignment doc.
 */
export async function POST(req: NextRequest) {
  // --- Auth ---
  const authHeader = req.headers.get("authorization") ?? "";
  const idToken = authHeader.replace("Bearer ", "").trim();
  let uid: string;
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    uid = decoded.uid;
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { assignmentId, syllabusId } = (await req.json()) as {
    assignmentId: string;
    syllabusId: string;
  };

  if (!assignmentId || !syllabusId) {
    return NextResponse.json({ error: "assignmentId and syllabusId required" }, { status: 400 });
  }

  // --- Load user's encrypted calendar token ---
  const userSnap = await adminDb.collection("users").doc(uid).get();
  const userData = userSnap.data() ?? {};
  const encryptedToken: string | undefined = userData.calendarToken;

  if (!encryptedToken) {
    return NextResponse.json({ error: "Google Calendar not connected" }, { status: 403 });
  }

  // --- Load assignment ---
  const assignSnap = await adminDb.collection("assignments").doc(assignmentId).get();
  if (!assignSnap.exists) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }
  const assignment = assignSnap.data()!;

  if (!assignment.dueDate) {
    return NextResponse.json({ error: "Assignment has no due date" }, { status: 400 });
  }

  // --- Build OAuth2 client ---
  const oauth2 = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URI
  );

  let refreshToken: string;
  try {
    refreshToken = decrypt(encryptedToken);
  } catch {
    return NextResponse.json({ error: "Failed to decrypt calendar token" }, { status: 500 });
  }

  oauth2.setCredentials({ refresh_token: refreshToken });

  const calendar = google.calendar({ version: "v3", auth: oauth2 });

  // --- Build event date ---
  // dueDate may be a Firestore Timestamp or an ISO string from the extractor.
  // IMPORTANT: use local year/month/day — NOT toISOString() which is always UTC
  // and can shift the date by ±1 day depending on the server's timezone offset.
  let dueDateStr: string;
  if (typeof assignment.dueDate === "string") {
    // Already an ISO date string like "2026-01-15" — use as-is
    dueDateStr = assignment.dueDate.slice(0, 10);
  } else if (assignment.dueDate?.toDate) {
    const d = assignment.dueDate.toDate();
    const yyyy = d.getFullYear();
    const mm   = String(d.getMonth() + 1).padStart(2, "0");
    const dd   = String(d.getDate()).padStart(2, "0");
    dueDateStr = `${yyyy}-${mm}-${dd}`;
  } else {
    return NextResponse.json({ error: "Unrecognised dueDate format" }, { status: 400 });
  }

  const eventBody = {
    summary: `📚 ${assignment.title}`,
    description: [
      assignment.notes ? `Notes: ${assignment.notes}` : null,
      `Weight: ${assignment.gradeWeight ?? "—"}%`,
      `Type: ${assignment.type}`,
    ].filter(Boolean).join("\n"),
    start: { date: dueDateStr },   // all-day event
    end:   { date: dueDateStr },
    reminders: {
      useDefault: false,
      overrides: [
        { method: "popup",  minutes: 24 * 60 },   // 1 day before
        { method: "popup",  minutes: 7 * 24 * 60 }, // 1 week before
      ],
    },
  };

  try {
    let eventId: string;
    const existingEventId: string | undefined = assignment.calendarEventId;

    if (existingEventId) {
      // Update existing event
      const updated = await calendar.events.update({
        calendarId: "primary",
        eventId: existingEventId,
        requestBody: eventBody,
      });
      eventId = updated.data.id!;
    } else {
      // Create new event
      const created = await calendar.events.insert({
        calendarId: "primary",
        requestBody: eventBody,
      });
      eventId = created.data.id!;
    }

    // Write eventId back to Firestore
    await adminDb.collection("assignments").doc(assignmentId).update({
      calendarEventId: eventId,
    });

    return NextResponse.json({ ok: true, eventId }, { status: 200 });
  } catch (err: unknown) {
    console.error("[calendar/sync]", err);
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
