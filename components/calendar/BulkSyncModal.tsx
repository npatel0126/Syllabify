"use client";

import React, { useEffect, useState } from "react";
import { GCAL_COLORS } from "./MiniCalendar";
import type { Assignment } from "@/types";

interface Props {
  open: boolean;
  onClose: () => void;
  assignments: Assignment[];
  /** Firebase ID token for auth */
  idToken: string;
}

const PREFIX_VARS = [
  { label: "📚 Title only",        template: "{title}" },
  { label: "📌 Type + Title",      template: "[{type}] {title}" },
  { label: "🎓 Course shorthand",  template: "{title} ({course})" },
];

function applyTemplate(template: string, a: Assignment, course: string): string {
  return template
    .replace("{title}", a.title)
    .replace("{type}", a.type)
    .replace("{course}", course);
}

export default function BulkSyncModal({ open, onClose, assignments, idToken }: Props) {
  const [template, setTemplate]     = useState("{title}");
  const [colorId, setColorId]       = useState("7"); // Peacock blue
  const [course, setCourse]         = useState("");
  const [syncing, setSyncing]       = useState(false);
  const [progress, setProgress]     = useState(0);
  const [done, setDone]             = useState(false);
  const [errors, setErrors]         = useState<string[]>([]);

  // Reset state when opened
  useEffect(() => {
    if (open) {
      setSyncing(false);
      setProgress(0);
      setDone(false);
      setErrors([]);
    }
  }, [open]);

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape" && !syncing) onClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, syncing]);

  if (!open) return null;

  const withDate = assignments.filter(a => !!a.dueDate);
  const alreadySynced = withDate.filter(a => !!a.calendarEventId).length;
  const toSync = withDate.length;

  async function handleSync() {
    setSyncing(true);
    setErrors([]);
    setProgress(0);

    const errs: string[] = [];

    for (let i = 0; i < withDate.length; i++) {
      const a = withDate[i];
      const customTitle = applyTemplate(template, a, course || "Course");
      try {
        const res = await fetch("/api/google-calendar/sync", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${idToken}`,
          },
          body: JSON.stringify({
            assignmentId: a.assignmentId,
            syllabusId:   a.syllabusId,
            customTitle,
            colorId,
          }),
        });
        if (!res.ok) {
          const { error } = await res.json().catch(() => ({}));
          errs.push(`${a.title}: ${error ?? "failed"}`);
        }
      } catch {
        errs.push(`${a.title}: network error`);
      }
      setProgress(i + 1);
    }

    setErrors(errs);
    setSyncing(false);
    setDone(true);
  }

  const selectedColor = GCAL_COLORS.find(c => c.id === colorId)!;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
      onClick={e => e.target === e.currentTarget && !syncing && onClose()}
    >
      <div className="w-full max-w-md rounded-2xl border border-[#1F1F1F] bg-[#111111] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#1F1F1F]">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0c1a2e] border border-[#7DD3FC]/20">
              <svg className="h-5 w-5 text-[#7DD3FC]" viewBox="0 0 24 24" fill="none">
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M3 9h18" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <div>
              <h2 className="text-sm font-semibold text-white">Add All to Calendar</h2>
              <p className="text-xs text-[#6B7280]">{toSync} assignments with due dates</p>
            </div>
          </div>
          {!syncing && (
            <button onClick={onClose} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#1F1F1F] hover:text-white transition">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        <div className="px-6 py-5 space-y-5">
          {!done ? (
            <>
              {/* Event name template */}
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">Event name format</label>
                <div className="space-y-2">
                  {PREFIX_VARS.map(p => (
                    <label key={p.template} className={[
                      "flex items-center gap-3 rounded-xl border px-3.5 py-2.5 cursor-pointer transition",
                      template === p.template
                        ? "border-[#7DD3FC]/40 bg-[#0c1a2e]"
                        : "border-[#1F1F1F] hover:border-[#2A2A2A]",
                    ].join(" ")}>
                      <input
                        type="radio"
                        name="tmpl"
                        value={p.template}
                        checked={template === p.template}
                        onChange={() => setTemplate(p.template)}
                        className="accent-[#7DD3FC]"
                      />
                      <div>
                        <p className="text-xs font-medium text-white">{p.label}</p>
                        <p className="text-[11px] text-[#6B7280] font-mono mt-0.5">{p.template}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Course name (for {course} template) */}
              {template.includes("{course}") && (
                <div>
                  <label className="block text-xs font-semibold text-[#9CA3AF] mb-1.5">Course shorthand</label>
                  <input
                    type="text"
                    value={course}
                    onChange={e => setCourse(e.target.value)}
                    placeholder="e.g. MATH 101"
                    className="w-full rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2 text-sm text-white outline-none focus:border-[#7DD3FC]/40 focus:ring-1 focus:ring-[#7DD3FC]/20"
                  />
                </div>
              )}

              {/* Colour picker */}
              <div>
                <label className="block text-xs font-semibold text-[#9CA3AF] mb-2">
                  Event colour
                  <span className="ml-2 font-normal text-[#6B7280]">({selectedColor.name})</span>
                </label>
                <div className="flex flex-wrap gap-2">
                  {GCAL_COLORS.map(c => (
                    <button
                      key={c.id}
                      title={c.name}
                      onClick={() => setColorId(c.id)}
                      className={[
                        "h-7 w-7 rounded-full transition-all",
                        colorId === c.id ? "ring-2 ring-offset-2 ring-offset-[#111111] ring-white scale-110" : "hover:scale-105",
                      ].join(" ")}
                      style={{ backgroundColor: c.hex }}
                    />
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-[#1F1F1F] bg-[#0A0A0A] px-4 py-3">
                <p className="text-[10px] text-[#6B7280] uppercase tracking-widest mb-1.5">Preview</p>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: selectedColor.hex }} />
                  <span className="text-sm text-white font-medium truncate">
                    {applyTemplate(template, {
                      title: "Midterm Exam",
                      type: "exam",
                    } as Assignment, course || "Course")}
                  </span>
                </div>
              </div>

              {alreadySynced > 0 && (
                <p className="text-[11px] text-[#6B7280]">
                  ⚠ {alreadySynced} assignment{alreadySynced !== 1 ? "s" : ""} already in calendar — will be updated.
                </p>
              )}

              {/* Sync button */}
              <button
                onClick={() => void handleSync()}
                disabled={syncing || toSync === 0}
                className="w-full rounded-xl bg-[#7DD3FC] px-4 py-2.5 text-sm font-semibold text-black hover:bg-[#38bdf8] transition disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
                  <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8"/>
                  <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  <path d="M12 13v4m0 0-2-2m2 2 2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Sync {toSync} assignment{toSync !== 1 ? "s" : ""}
              </button>
            </>
          ) : (
            <>
              {/* Progress / done state */}
              {syncing ? (
                <div className="space-y-3">
                  <p className="text-sm text-white font-medium">Syncing {progress}/{toSync}…</p>
                  <div className="h-1.5 w-full rounded-full bg-[#1F1F1F] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#7DD3FC] transition-all duration-200"
                      style={{ width: `${(progress / toSync) * 100}%` }}
                    />
                  </div>
                </div>
              ) : (
                <div className="text-center space-y-3 py-2">
                  {errors.length === 0 ? (
                    <>
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#4ADE80]/10 border border-[#4ADE80]/20 mx-auto">
                        <svg className="h-6 w-6 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                        </svg>
                      </div>
                      <p className="text-sm font-semibold text-white">All synced!</p>
                      <p className="text-xs text-[#6B7280]">{toSync} events added to Google Calendar</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm font-semibold text-white">
                        Done — {toSync - errors.length}/{toSync} synced
                      </p>
                      <div className="text-left space-y-1 max-h-32 overflow-y-auto">
                        {errors.map((e, i) => (
                          <p key={i} className="text-xs text-red-400">{e}</p>
                        ))}
                      </div>
                    </>
                  )}
                  <button
                    onClick={onClose}
                    className="mt-2 rounded-xl border border-[#1F1F1F] px-5 py-2 text-sm text-[#9CA3AF] hover:bg-[#1F1F1F] transition"
                  >
                    Close
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Progress bar while syncing */}
        {syncing && (
          <div className="px-6 pb-5 space-y-2">
            <div className="flex justify-between text-xs text-[#6B7280]">
              <span>Syncing…</span>
              <span>{progress}/{toSync}</span>
            </div>
            <div className="h-1.5 w-full rounded-full bg-[#1F1F1F] overflow-hidden">
              <div
                className="h-full rounded-full bg-[#7DD3FC] transition-all duration-200"
                style={{ width: `${(progress / toSync) * 100}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
