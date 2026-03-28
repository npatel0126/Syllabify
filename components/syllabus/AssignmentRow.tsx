"use client";

import React, { useState } from "react";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import type { Assignment } from "@/types";
import Badge from "@/components/ui/Badge";
import { formatDueDate, isOverdue } from "@/lib/utils/dates";

function toISODateValue(dateLike: Date | unknown): string {
  if (!(dateLike instanceof Date)) return "";
  const yyyy = dateLike.getFullYear();
  const mm = String(dateLike.getMonth() + 1).padStart(2, "0");
  const dd = String(dateLike.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function AssignmentRow({
  assignment,
  onConfirmDueDate,
}: Readonly<{
  assignment: Assignment;
  onConfirmDueDate?: (assignmentId: string, dueDate: Date) => void;
}>) {
  const { user } = useFirebaseAuth();
  const overdue = isOverdue(assignment.dueDate);

  const [syncing, setSyncing] = useState(false);
  const [synced, setSynced] = useState(!!assignment.calendarEventId);
  const [syncError, setSyncError] = useState<string | null>(null);

  async function handleAddToCalendar() {
    if (!user || syncing) return;
    setSyncing(true);
    setSyncError(null);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/google-calendar/sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          assignmentId: assignment.assignmentId,
          syllabusId: assignment.syllabusId,
        }),
      });
      if (!res.ok) {
        const { error } = await res.json().catch(() => ({}));
        // Surface a friendly message if Calendar isn't connected yet
        if (res.status === 403) {
          setSyncError("Connect Google Calendar in Settings first.");
        } else {
          setSyncError(error ?? "Failed to add to calendar.");
        }
        return;
      }
      setSynced(true);
    } catch {
      setSyncError("Network error — try again.");
    } finally {
      setSyncing(false);
    }
  }

  const hasDueDate = !!assignment.dueDate;

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-neutral-800 last:border-b-0">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge type={assignment.type}>{assignment.type.toUpperCase()}</Badge>
          <div className="font-semibold text-neutral-100 truncate">{assignment.title}</div>
          <div className="text-xs text-neutral-400 rounded-full bg-neutral-800/40 border border-neutral-700 px-2 py-1 font-semibold">
            {assignment.gradeWeight}% weight
          </div>
        </div>
        <div className={["mt-1 text-sm", overdue ? "text-red-400" : "text-neutral-400"].join(" ")}>
          Due: {formatDueDate(assignment.dueDate)}
          {!assignment.dueDateConfirmed && (
            <span className="ml-2 inline-flex items-center rounded-full bg-yellow-500/15 text-yellow-200 border border-yellow-400/40 px-2 py-0.5 text-xs font-semibold">
              Unconfirmed
            </span>
          )}
        </div>
        {syncError && (
          <p className="mt-1 text-xs text-red-400">{syncError}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Confirm due date input (unconfirmed assignments) */}
        {!assignment.dueDateConfirmed && onConfirmDueDate && (
          <div className="flex items-center gap-2">
            <input
              type="date"
              aria-label="Confirm due date"
              title="Confirm due date"
              className="rounded-md bg-neutral-800/40 border border-neutral-700 px-2 py-1 text-sm text-neutral-100"
              defaultValue={toISODateValue(assignment.dueDate)}
              onChange={(e) => {
                const value = e.target.value;
                if (!value) return;
                const parsed = new Date(value + "T00:00:00");
                onConfirmDueDate(assignment.assignmentId, parsed);
              }}
            />
            <div className="text-xs text-neutral-500">Confirm</div>
          </div>
        )}

        {/* Add to Google Calendar button — only if there's a due date */}
        {hasDueDate && (
          synced ? (
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#4ADE80]/30 bg-[#052e16] px-3 py-1 text-xs font-semibold text-[#4ADE80]">
              <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
              In Calendar
            </span>
          ) : (
            <button
              onClick={() => void handleAddToCalendar()}
              disabled={syncing}
              title="Add to Google Calendar"
              className="inline-flex items-center gap-1.5 rounded-full border border-[#7DD3FC]/30 bg-[#0c1a2e] px-3 py-1 text-xs font-semibold text-[#7DD3FC] hover:bg-[#7DD3FC]/10 transition disabled:opacity-50"
            >
              {syncing ? (
                <span className="h-3 w-3 rounded-full border-2 border-[#7DD3FC]/30 border-t-[#7DD3FC] animate-spin" />
              ) : (
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
                </svg>
              )}
              {syncing ? "Adding…" : "Add to Calendar"}
            </button>
          )
        )}
      </div>
    </div>
  );
}

