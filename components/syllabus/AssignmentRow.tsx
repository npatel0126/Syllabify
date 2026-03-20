"use client";

import React from "react";
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
  onConfirmDueDate
}: Readonly<{
  assignment: Assignment;
  onConfirmDueDate?: (assignmentId: string, dueDate: Date) => void;
}>) {
  const overdue = isOverdue(assignment.dueDate);

  return (
    <div className="flex items-center justify-between gap-4 py-3 border-b border-neutral-800">
      <div className="min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Badge type={assignment.type}>{assignment.type.toUpperCase()}</Badge>
          <div className="font-semibold text-neutral-100 truncate">{assignment.title}</div>
          <div className="text-xs text-neutral-400 rounded-full bg-neutral-800/40 border border-neutral-700 px-2 py-1 font-semibold">
            {assignment.gradeWeight}% weight
          </div>
        </div>
        <div className={["mt-1 text-sm", overdue ? "text-red-400" : "text-neutral-400"].join(" ")}>
          Due: {formatDueDate(assignment.dueDate)}
          {!assignment.dueDateConfirmed ? (
            <span className="ml-2 inline-flex items-center rounded-full bg-yellow-500/15 text-yellow-200 border border-yellow-400/40 px-2 py-0.5 text-xs font-semibold">
              Unconfirmed
            </span>
          ) : null}
        </div>
      </div>

      {!assignment.dueDateConfirmed && onConfirmDueDate ? (
        <div className="flex items-center gap-2">
          <input
            type="date"
            className="rounded-md bg-neutral-800/40 border border-neutral-700 px-2 py-1 text-sm text-neutral-100"
            defaultValue={toISODateValue(assignment.dueDate)}
            onChange={(e) => {
              const value = e.target.value;
              // TODO: parse in local timezone correctly.
              if (!value) return;
              const parsed = new Date(value + "T00:00:00");
              onConfirmDueDate(assignment.assignmentId, parsed);
            }}
          />
          <div className="text-xs text-neutral-500">Confirm</div>
        </div>
      ) : null}
    </div>
  );
}

