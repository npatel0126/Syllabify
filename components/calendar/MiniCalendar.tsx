"use client";

import React, { useState } from "react";
import type { Assignment } from "@/types";
import type { Timestamp } from "firebase/firestore";

// Google Calendar colour palette (colorId → hex)
export const GCAL_COLORS: { id: string; name: string; hex: string }[] = [
  { id: "1",  name: "Tomato",    hex: "#D50000" },
  { id: "2",  name: "Flamingo",  hex: "#E67C73" },
  { id: "3",  name: "Tangerine", hex: "#F4511E" },
  { id: "4",  name: "Banana",    hex: "#F6BF26" },
  { id: "5",  name: "Sage",      hex: "#33B679" },
  { id: "6",  name: "Basil",     hex: "#0B8043" },
  { id: "7",  name: "Peacock",   hex: "#039BE5" },
  { id: "8",  name: "Blueberry", hex: "#3F51B5" },
  { id: "9",  name: "Lavender",  hex: "#7986CB" },
  { id: "10", name: "Grape",     hex: "#8E24AA" },
  { id: "11", name: "Graphite",  hex: "#616161" },
];

function toLocalDate(value: Timestamp | Date | string | unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof (value as Timestamp).toDate === "function") return (value as Timestamp).toDate();
  if (typeof value === "string") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

const TYPE_COLOR: Record<string, string> = {
  exam:       "#F87171", // red
  quiz:       "#FB923C", // orange
  paper:      "#A78BFA", // purple
  homework:   "#60A5FA", // blue
  lab:        "#34D399", // green
  "term test":"#C084FC", // violet
};

interface Props {
  assignments: Assignment[];
  /** Called when user clicks a day that has assignments */
  onDayClick?: (assignments: Assignment[]) => void;
}

export default function MiniCalendar({ assignments, onDayClick }: Props) {
  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth()); // 0-based

  const firstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  // Build a map: "YYYY-MM-DD" → Assignment[]
  const dayMap = new Map<string, Assignment[]>();
  for (const a of assignments) {
    const d = toLocalDate(a.dueDate);
    if (!d) continue;
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    if (!dayMap.has(key)) dayMap.set(key, []);
    dayMap.get(key)!.push(a);
  }

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  }

  const monthName = new Date(viewYear, viewMonth, 1).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  // Pad leading empty cells
  const cells: (number | null)[] = [...Array(firstDay).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  // Pad trailing
  while (cells.length % 7 !== 0) cells.push(null);

  return (
    <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5 select-none">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#1F1F1F] hover:text-white transition"
          aria-label="Previous month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <span className="text-sm font-semibold text-white">{monthName}</span>
        <button
          onClick={nextMonth}
          className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#1F1F1F] hover:text-white transition"
          aria-label="Next month"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d => (
          <div key={d} className="text-center text-[10px] font-semibold text-[#4B5563] py-1">{d}</div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-y-0.5">
        {cells.map((day, i) => {
          if (!day) return <div key={`empty-${i}`} />;

          const key = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const dayAssignments = dayMap.get(key) ?? [];
          const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
          const hasDue = dayAssignments.length > 0;

          return (
            <div
              key={key}
              onClick={() => hasDue && onDayClick?.(dayAssignments)}
              className={[
                "relative flex flex-col items-center py-1 rounded-lg transition-all",
                hasDue ? "cursor-pointer hover:bg-[#1A1A1A]" : "",
                isToday ? "ring-1 ring-[#4ADE80]/60" : "",
              ].join(" ")}
            >
              <span className={[
                "text-xs font-medium w-6 h-6 flex items-center justify-center rounded-full",
                isToday ? "bg-[#4ADE80] text-black font-bold" : hasDue ? "text-white" : "text-[#4B5563]",
              ].join(" ")}>
                {day}
              </span>

              {/* Dot indicators — up to 3 */}
              {hasDue && (
                <div className="flex items-center gap-0.5 mt-0.5">
                  {dayAssignments.slice(0, 3).map((a, di) => (
                    <span
                      key={di}
                      className="h-1 w-1 rounded-full"
                      style={{ backgroundColor: TYPE_COLOR[a.type] ?? "#9CA3AF" }}
                    />
                  ))}
                  {dayAssignments.length > 3 && (
                    <span className="text-[8px] text-[#6B7280] leading-none">+</span>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-3 border-t border-[#1F1F1F] flex flex-wrap gap-x-3 gap-y-1.5">
        {Object.entries(TYPE_COLOR).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[10px] text-[#6B7280] capitalize">{type}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
