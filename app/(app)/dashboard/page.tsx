"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { doc, getDoc } from "firebase/firestore";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { signOut } from "@/lib/firebase/auth";
import { updateSyllabus, deleteSyllabus } from "@/lib/firebase/firestore";
import { db } from "@/lib/firebase/config";
import useSyllabi from "@/hooks/useSyllabi";
import useAllAssignments from "@/hooks/useAllAssignments";
import UploadZone from "@/components/syllabus/UploadZone";
import MiniCalendar from "@/components/calendar/MiniCalendar";
import BulkSyncModal from "@/components/calendar/BulkSyncModal";
import type { Assignment, Syllabus } from "@/types";
import type { Timestamp } from "firebase/firestore";

// ── helpers ───────────────────────────────────────────────────────────────────
function getFirstName(displayName: string | null, email: string | null): string {
  if (displayName) return displayName.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

function getGreeting(): string {
  const h = new Date().getHours();
  if (h < 12) return "Good morning";
  if (h < 18) return "Good afternoon";
  return "Good evening";
}

function getDateString(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

function getInitials(name: string | null, email: string | null): string {
  if (name) {
    const parts = name.trim().split(" ");
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0][0].toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return "?";
}

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

const TYPE_LABEL: Record<string, string> = {
  exam: "Exam",
  quiz: "Quiz",
  paper: "Paper",
  homework: "Homework",
  lab: "Lab",
  "term test": "Term Test",
};

const TYPE_COLOR: Record<string, string> = {
  exam: "#F87171",
  quiz: "#FB923C",
  paper: "#A78BFA",
  homework: "#60A5FA",
  lab: "#34D399",
  "term test": "#C084FC",
};

type NavTab = "overview" | "calendar" | "upload" | "settings";

// ── CourseCard ────────────────────────────────────────────────────────────────
function CourseCard({
  syllabus,
  onRename,
  onDelete,
}: {
  syllabus: Syllabus;
  onRename: (id: string, newName: string) => Promise<void>;
  onDelete: (id: string, name: string) => void;
}) {
  const isReady = syllabus.status === "ready";
  const isProcessing = syllabus.status === "processing";
  const isError = syllabus.status === "error";

  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(syllabus.courseName);
  const [saving, setSaving] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const renameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [menuOpen]);

  useEffect(() => {
    if (renaming) {
      setRenameValue(syllabus.courseName);
      setTimeout(() => renameRef.current?.select(), 0);
    }
  }, [renaming, syllabus.courseName]);

  async function commitRename() {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === syllabus.courseName) { setRenaming(false); return; }
    setSaving(true);
    try { await onRename(syllabus.syllabusId, trimmed); }
    finally { setSaving(false); setRenaming(false); }
  }

  return (
    <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5 flex flex-col gap-4 hover:border-[#2A2A2A] transition-all duration-200">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              ref={renameRef}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void commitRename();
                if (e.key === "Escape") setRenaming(false);
              }}
              onBlur={() => void commitRename()}
              disabled={saving}
              title="Course name"
              placeholder="Course name"
              className="w-full rounded-lg border border-[#4ADE80]/40 bg-[#0A0A0A] px-2 py-1 text-sm font-semibold text-white outline-none focus:border-[#4ADE80] disabled:opacity-60"
            />
          ) : (
            <h3 className="text-base font-semibold text-white truncate leading-snug">{syllabus.courseName}</h3>
          )}
          {(syllabus.professor || syllabus.semester) && !renaming && (
            <p className="mt-0.5 text-xs text-[#6B7280] truncate">
              {[syllabus.professor, syllabus.semester].filter(Boolean).join(" · ")}
            </p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isProcessing && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#7DD3FC]/30 bg-[#0c1a2e] px-2.5 py-1 text-xs text-[#7DD3FC]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#7DD3FC] animate-pulse" />Processing
            </span>
          )}
          {isReady && (
            <span className="flex items-center gap-1.5 rounded-full border border-[#4ADE80]/30 bg-[#052e16] px-2.5 py-1 text-xs text-[#4ADE80]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#4ADE80]" />Ready
            </span>
          )}
          {isError && (
            <span className="flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-950/40 px-2.5 py-1 text-xs text-red-400">
              <span className="h-1.5 w-1.5 rounded-full bg-red-400" />Error
            </span>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="rounded-lg p-1 text-[#4B5563] hover:bg-[#1F1F1F] hover:text-[#9CA3AF] transition"
              aria-label="Course options"
            >
              <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                <path d="M10 3a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM10 8.5a1.5 1.5 0 1 1 0 3 1.5 1.5 0 0 1 0-3ZM11.5 15.5a1.5 1.5 0 1 0-3 0 1.5 1.5 0 0 0 3 0Z" />
              </svg>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-7 z-30 w-40 rounded-xl border border-[#1F1F1F] bg-[#161616] py-1 shadow-2xl">
                <button
                  onClick={() => { setMenuOpen(false); setRenaming(true); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-[#D1D5DB] hover:bg-[#1F1F1F] transition"
                >
                  <svg className="h-3.5 w-3.5 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L6.832 19.82a4.5 4.5 0 0 1-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 0 1 1.13-1.897L16.863 4.487Zm0 0L19.5 7.125" />
                  </svg>
                  Rename
                </button>
                <div className="my-1 h-px bg-[#1F1F1F]" />
                <button
                  onClick={() => { setMenuOpen(false); onDelete(syllabus.syllabusId, syllabus.courseName); }}
                  className="flex w-full items-center gap-2.5 px-3 py-2 text-xs text-red-400 hover:bg-red-950/40 transition"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  Delete course
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {isReady ? (
        <div className="flex flex-wrap gap-2">
          <Link href={`/course/${syllabus.syllabusId}`} className="rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-1.5 text-xs text-[#9CA3AF] hover:border-[#4ADE80]/40 hover:text-[#4ADE80] transition-all duration-150">Overview</Link>
          <Link href={`/course/${syllabus.syllabusId}/chat`} className="rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-1.5 text-xs text-[#9CA3AF] hover:border-[#7DD3FC]/40 hover:text-[#7DD3FC] transition-all duration-150">Chat with SyllAI</Link>
          <Link href={`/course/${syllabus.syllabusId}/grades`} className="rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-1.5 text-xs text-[#9CA3AF] hover:border-[#A78BFA]/40 hover:text-[#A78BFA] transition-all duration-150">Grades</Link>
        </div>
      ) : isProcessing ? (
        <p className="text-xs text-[#6B7280]">AI is extracting your assignments — usually under a minute…</p>
      ) : isError ? (
        <p className="text-xs text-red-400/80">Something went wrong during processing. Try re-uploading.</p>
      ) : null}
    </div>
  );
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ open, onClose, onUploadComplete }: {
  open: boolean; onClose: () => void; onUploadComplete: (url: string, id: string) => void;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-lg rounded-2xl border border-[#1F1F1F] bg-[#111111] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-white">Upload Syllabus</h2>
          <button onClick={onClose} className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#1F1F1F] hover:text-white transition" aria-label="Close">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <UploadZone onUploadComplete={(url, id) => { onUploadComplete(url, id); onClose(); }} />
      </div>
    </div>
  );
}

// ── Delete Confirm Modal ──────────────────────────────────────────────────────
function DeleteConfirmModal({ courseName, onConfirm, onCancel, deleting }: {
  courseName: string; onConfirm: () => void; onCancel: () => void; deleting: boolean;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onCancel(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="w-full max-w-sm rounded-2xl border border-[#1F1F1F] bg-[#111111] p-6 shadow-2xl">
        <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-950/60 border border-red-500/20 mb-4">
          <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
          </svg>
        </div>
        <h2 className="text-base font-semibold text-white">Delete course?</h2>
        <p className="mt-1.5 text-sm text-[#6B7280]">
          <span className="font-medium text-[#D1D5DB]">{courseName}</span> and all its assignments and grades will be permanently deleted. This cannot be undone.
        </p>
        <div className="mt-6 flex gap-3">
          <button onClick={onCancel} disabled={deleting} className="flex-1 rounded-xl border border-[#1F1F1F] px-4 py-2.5 text-sm font-medium text-[#9CA3AF] hover:bg-[#1F1F1F] transition disabled:opacity-50">Cancel</button>
          <button onClick={onConfirm} disabled={deleting} className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 transition disabled:opacity-50 flex items-center justify-center gap-2">
            {deleting && <span className="h-3.5 w-3.5 rounded-full border-2 border-white/30 border-t-white animate-spin" />}
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Day Detail Modal ──────────────────────────────────────────────────────────
function DayDetailModal({ assignments, onClose }: { assignments: Assignment[]; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (assignments.length === 0) return null;

  const date = toLocalDate(assignments[0].dueDate);
  const dateLabel = date?.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" }) ?? "";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-sm rounded-2xl border border-[#1F1F1F] bg-[#111111] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#1F1F1F]">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-[#6B7280]">Due</p>
            <h2 className="text-sm font-semibold text-white">{dateLabel}</h2>
          </div>
          <button onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#1F1F1F] hover:text-white transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <ul className="divide-y divide-[#1F1F1F]">
          {assignments.map((a) => (
            <li key={a.assignmentId} className="flex items-center gap-3 px-5 py-3">
              <span className="h-2 w-2 rounded-full shrink-0" style={{ backgroundColor: TYPE_COLOR[a.type] ?? "#9CA3AF" }} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-white truncate">{a.title}</p>
                <p className="text-xs text-[#6B7280]">{TYPE_LABEL[a.type] ?? a.type}</p>
              </div>
              {a.calendarEventId && (
                <span title="In calendar" className="text-[10px] text-[#7DD3FC] border border-[#7DD3FC]/30 rounded px-1.5 py-0.5">Cal</span>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

// ── Upcoming list ─────────────────────────────────────────────────────────────
function UpcomingList({ assignments, days = 14 }: { assignments: Assignment[]; days?: number }) {
  const now = new Date();
  const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

  const upcoming = assignments
    .filter((a) => { const d = toLocalDate(a.dueDate); return d && d >= now && d <= cutoff; })
    .sort((a, b) => toLocalDate(a.dueDate)!.getTime() - toLocalDate(b.dueDate)!.getTime());

  if (upcoming.length === 0) {
    return (
      <div className="rounded-xl border border-[#1F1F1F] bg-[#111111] px-4 py-6 text-center">
        <p className="text-xs text-[#4B5563]">Nothing due in the next {days} days</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] overflow-hidden">
      <div className="px-4 py-3 border-b border-[#1F1F1F]">
        <p className="text-xs font-semibold uppercase tracking-widest text-[#4B5563]">Next {days} Days</p>
      </div>
      <ul className="divide-y divide-[#1A1A1A]">
        {upcoming.map((a) => {
          const d = toLocalDate(a.dueDate)!;
          const isToday = d.toDateString() === now.toDateString();
          const isTomorrow = d.toDateString() === new Date(now.getTime() + 86400000).toDateString();
          const label = isToday ? "Today" : isTomorrow ? "Tomorrow" : d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
          return (
            <li key={a.assignmentId} className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#141414] transition">
              <span className="h-1.5 w-1.5 rounded-full shrink-0 mt-px" style={{ backgroundColor: TYPE_COLOR[a.type] ?? "#9CA3AF" }} />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-white truncate">{a.title}</p>
                <p className="text-[10px] text-[#6B7280]">{TYPE_LABEL[a.type] ?? a.type}</p>
              </div>
              <span className={["text-[10px] font-medium shrink-0", isToday ? "text-red-400" : "text-[#6B7280]"].join(" ")}>{label}</span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

// ── Calendar icon SVG ─────────────────────────────────────────────────────────
function CalIconSvg({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none">
      <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8"/>
      <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
      <path d="M12 13v4m0 0-2-2m2 2 2-2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const { syllabi } = useSyllabi(user?.uid);
  const { assignments } = useAllAssignments(user?.uid);

  const [uploadOpen, setUploadOpen] = useState(false);
  const [activeNav, setActiveNav] = useState<NavTab>("overview");

  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [dayAssignments, setDayAssignments] = useState<Assignment[]>([]);
  const [bulkSyncOpen, setBulkSyncOpen] = useState(false);
  const [idToken, setIdToken] = useState("");
  const [calendarConnected, setCalendarConnected] = useState(false);

  useEffect(() => {
    if (!user) return;
    user.getIdToken().then(setIdToken).catch(() => {});
    getDoc(doc(db, "users", user.uid))
      .then((snap) => { if (snap.exists()) setCalendarConnected(!!snap.data()?.calendarConnected); })
      .catch(() => {});
  }, [user]);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  const handleUploadComplete = useCallback(() => { setActiveNav("overview"); }, []);
  const openUpload = useCallback(() => { setUploadOpen(true); setActiveNav("upload"); }, []);
  const closeUpload = useCallback(() => { setUploadOpen(false); setActiveNav("overview"); }, []);
  const handleRename = useCallback(async (id: string, newName: string) => { await updateSyllabus(id, { courseName: newName }); }, []);
  const handleDeleteRequest = useCallback((id: string, name: string) => { setDeleteTarget({ id, name }); }, []);
  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try { await deleteSyllabus(deleteTarget.id); } finally { setDeleting(false); setDeleteTarget(null); }
  }, [deleteTarget]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const firstName = getFirstName(user.displayName, user.email);
  const initials = getInitials(user.displayName, user.email);
  const totalCourses = syllabi.length;
  const readyCount = syllabi.filter((s) => s.status === "ready").length;
  const processingCount = syllabi.filter((s) => s.status === "processing").length;

  const now = new Date();
  const cutoff14 = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const upcomingCount = assignments.filter((a) => { const d = toLocalDate(a.dueDate); return d && d >= now && d <= cutoff14; }).length;
  const assignmentsWithDate = assignments.filter((a) => !!a.dueDate);

  return (
    <>
      <UploadModal open={uploadOpen} onClose={closeUpload} onUploadComplete={handleUploadComplete} />

      {deleteTarget && (
        <DeleteConfirmModal
          courseName={deleteTarget.name}
          onConfirm={() => void handleDeleteConfirm()}
          onCancel={() => setDeleteTarget(null)}
          deleting={deleting}
        />
      )}

      {dayAssignments.length > 0 && (
        <DayDetailModal assignments={dayAssignments} onClose={() => setDayAssignments([])} />
      )}

      {calendarConnected && (
        <BulkSyncModal
          open={bulkSyncOpen}
          onClose={() => setBulkSyncOpen(false)}
          assignments={assignments}
          idToken={idToken}
        />
      )}

      <div className="flex min-h-screen bg-[#0A0A0A]">
        {/* ── Sidebar ── */}
        <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-[#1F1F1F]">
          <div className="flex h-16 items-center px-5 border-b border-[#1F1F1F]">
            <span className="text-lg font-bold tracking-tight">
              <span className="text-[#4ADE80]">Syllab</span><span className="text-white">ify</span>
            </span>
          </div>

          <nav className="flex-1 flex flex-col gap-1 px-3 py-4">
            {/* Overview */}
            <button
              onClick={() => { setActiveNav("overview"); setUploadOpen(false); }}
              className={["flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left w-full", activeNav === "overview" ? "bg-[#111111] text-white" : "text-[#6B7280] hover:bg-[#111111] hover:text-[#D1D5DB]"].join(" ")}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 0 1 6 3.75h2.25A2.25 2.25 0 0 1 10.5 6v2.25a2.25 2.25 0 0 1-2.25 2.25H6a2.25 2.25 0 0 1-2.25-2.25V6ZM3.75 15.75A2.25 2.25 0 0 1 6 13.5h2.25a2.25 2.25 0 0 1 2.25 2.25V18a2.25 2.25 0 0 1-2.25 2.25H6A2.25 2.25 0 0 1 3.75 18v-2.25ZM13.5 6a2.25 2.25 0 0 1 2.25-2.25H18A2.25 2.25 0 0 1 20.25 6v2.25A2.25 2.25 0 0 1 18 10.5h-2.25a2.25 2.25 0 0 1-2.25-2.25V6ZM13.5 15.75a2.25 2.25 0 0 1 2.25-2.25H18a2.25 2.25 0 0 1 2.25 2.25V18A2.25 2.25 0 0 1 18 20.25h-2.25A2.25 2.25 0 0 1 13.5 18v-2.25Z" />
              </svg>
              Overview
            </button>

            {/* Calendar */}
            <button
              onClick={() => { setActiveNav("calendar"); setUploadOpen(false); }}
              className={["flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left w-full", activeNav === "calendar" ? "bg-[#111111] text-white" : "text-[#6B7280] hover:bg-[#111111] hover:text-[#D1D5DB]"].join(" ")}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="4" width="18" height="17" rx="2" stroke="currentColor" strokeWidth="1.8" fill="none"/>
                <path d="M3 9h18" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M8 2v4M16 2v4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <span className="flex-1">Calendar</span>
              {upcomingCount > 0 && (
                <span className="rounded-full bg-[#4ADE80]/20 px-1.5 py-0.5 text-[10px] font-semibold text-[#4ADE80]">{upcomingCount}</span>
              )}
            </button>

            {/* Upload */}
            <button
              onClick={openUpload}
              className={["flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all text-left w-full", activeNav === "upload" ? "bg-[#111111] text-white" : "text-[#6B7280] hover:bg-[#111111] hover:text-[#D1D5DB]"].join(" ")}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5m-13.5-9L12 3m0 0 4.5 4.5M12 3v13.5" />
              </svg>
              Upload Syllabus
            </button>

            {/* Settings */}
            <Link
              href="/settings"
              onClick={() => setActiveNav("settings")}
              className={["flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all", activeNav === "settings" ? "bg-[#111111] text-white" : "text-[#6B7280] hover:bg-[#111111] hover:text-[#D1D5DB]"].join(" ")}
            >
              <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.325.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 0 1 1.37.49l1.296 2.247a1.125 1.125 0 0 1-.26 1.431l-1.003.827c-.293.241-.438.613-.43.992a7.723 7.723 0 0 1 0 .255c-.008.378.137.75.43.991l1.004.827c.424.35.534.955.26 1.43l-1.298 2.247a1.125 1.125 0 0 1-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.47 6.47 0 0 1-.22.128c-.331.183-.581.495-.644.869l-.213 1.281c-.09.543-.56.94-1.11.94h-2.594c-.55 0-1.019-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 0 1-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 0 1-1.369-.49l-1.297-2.247a1.125 1.125 0 0 1 .26-1.431l1.004-.827c.292-.24.437-.613.43-.991a6.932 6.932 0 0 1 0-.255c.007-.38-.138-.751-.43-.992l-1.004-.827a1.125 1.125 0 0 1-.26-1.43l1.297-2.247a1.125 1.125 0 0 1 1.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.086.22-.128.332-.183.582-.495.644-.869l.214-1.28Z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
              </svg>
              Settings
            </Link>
          </nav>

          {/* user footer */}
          <div className="border-t border-[#1F1F1F] p-4">
            <div className="flex items-center gap-3">
              {user.photoURL ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={user.photoURL} alt="Avatar" className="h-8 w-8 rounded-full object-cover ring-1 ring-[#1F1F1F]" />
              ) : (
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#4ADE80]/20 text-xs font-semibold text-[#4ADE80]">{initials}</div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white truncate">{user.displayName ?? user.email}</p>
                {user.displayName && <p className="text-[10px] text-[#6B7280] truncate">{user.email}</p>}
              </div>
              <button onClick={() => void signOut().then(() => router.replace("/login"))} title="Sign out" className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#1F1F1F] hover:text-white transition">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15M12 9l-3 3m0 0 3 3m-3-3h12.75" />
                </svg>
              </button>
            </div>
          </div>
        </aside>

        {/* ── Main ── */}
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex h-16 items-center justify-between gap-4 border-b border-[#1F1F1F] px-6">
            <span className="md:hidden text-base font-bold">
              <span className="text-[#4ADE80]">Syllab</span><span className="text-white">ify</span>
            </span>
            <div className="hidden md:block">
              <p className="text-sm font-medium text-white">{getGreeting()}, {firstName} 👋</p>
              <p className="text-xs text-[#6B7280]">{getDateString()}</p>
            </div>

            <div className="ml-auto flex items-center gap-3">
              {calendarConnected && assignmentsWithDate.length > 0 && (
                <button
                  onClick={() => setBulkSyncOpen(true)}
                  className="hidden sm:flex items-center gap-2 rounded-xl border border-[#7DD3FC]/30 bg-[#0c1a2e] px-3.5 py-2 text-xs font-semibold text-[#7DD3FC] hover:border-[#7DD3FC]/50 transition"
                >
                  <CalIconSvg className="h-3.5 w-3.5" />
                  Add All to Calendar
                </button>
              )}
              <button onClick={openUpload} className="flex items-center gap-2 rounded-xl bg-[#4ADE80] px-4 py-2 text-sm font-semibold text-black hover:bg-[#22c55e] transition-colors">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                New Syllabus
              </button>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto px-6 py-8">
            {/* mobile greeting */}
            <div className="md:hidden mb-6">
              <p className="text-base font-semibold text-white">{getGreeting()}, {firstName} 👋</p>
              <p className="text-xs text-[#6B7280] mt-0.5">{getDateString()}</p>
            </div>

            {/* ── CALENDAR TAB ── */}
            {activeNav === "calendar" && (
              <div className="flex flex-col xl:flex-row gap-6">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-xs font-semibold uppercase tracking-widest text-[#4B5563]">Assignment Calendar</h2>
                    {calendarConnected && (
                      <button onClick={() => setBulkSyncOpen(true)} className="flex items-center gap-1.5 rounded-lg border border-[#7DD3FC]/30 bg-[#0c1a2e] px-3 py-1.5 text-xs font-semibold text-[#7DD3FC] hover:border-[#7DD3FC]/50 transition">
                        <CalIconSvg className="h-3 w-3" />
                        Add All to Calendar
                      </button>
                    )}
                  </div>
                  <MiniCalendar assignments={assignments} onDayClick={(dayA) => setDayAssignments(dayA)} />
                </div>

                <div className="w-full xl:w-72 shrink-0">
                  <h2 className="text-xs font-semibold uppercase tracking-widest text-[#4B5563] mb-4">Upcoming</h2>
                  <UpcomingList assignments={assignments} days={14} />
                  {!calendarConnected && (
                    <div className="mt-4 rounded-xl border border-[#7DD3FC]/20 bg-[#0c1a2e] px-4 py-4">
                      <p className="text-xs font-semibold text-[#7DD3FC] mb-1">Sync with Google Calendar</p>
                      <p className="text-[11px] text-[#6B7280] mb-3">Add all your assignments as calendar events in one click.</p>
                      <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-lg bg-[#7DD3FC] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#38bdf8] transition">Connect in Settings →</Link>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* ── OVERVIEW TAB ── */}
            {activeNav === "overview" && (
              <>
                {totalCourses > 0 && (
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    {[
                      { label: "Total Courses", value: totalCourses, color: "text-white" },
                      { label: "Ready", value: readyCount, color: "text-[#4ADE80]" },
                      { label: "Processing", value: processingCount, color: "text-[#7DD3FC]" },
                    ].map(({ label, value, color }) => (
                      <div key={label} className="rounded-xl border border-[#1F1F1F] bg-[#111111] px-4 py-4">
                        <p className={`text-2xl font-bold ${color}`}>{value}</p>
                        <p className="mt-1 text-xs text-[#6B7280]">{label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {processingCount > 0 && (
                  <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#7DD3FC]/20 bg-[#0c1a2e] px-4 py-3">
                    <span className="h-2 w-2 rounded-full bg-[#7DD3FC] animate-pulse shrink-0" />
                    <p className="text-sm text-[#7DD3FC]">
                      {processingCount === 1 ? "1 syllabus is being processed by AI — usually under a minute." : `${processingCount} syllabi are being processed — usually under a minute.`}
                    </p>
                  </div>
                )}

                {syllabi.length > 0 ? (
                  <div className="flex flex-col xl:flex-row gap-6">
                    {/* Course grid */}
                    <div className="flex-1 min-w-0">
                      <h2 className="text-xs font-semibold uppercase tracking-widest text-[#4B5563] mb-4">Your Courses</h2>
                      <div className="grid gap-4 sm:grid-cols-2">
                        {syllabi.map((s) => (
                          <CourseCard key={s.syllabusId} syllabus={s} onRename={handleRename} onDelete={handleDeleteRequest} />
                        ))}
                      </div>
                    </div>

                    {/* Right rail */}
                    {assignments.length > 0 && (
                      <div className="w-full xl:w-72 shrink-0 space-y-4">
                        <div>
                          <h2 className="text-xs font-semibold uppercase tracking-widest text-[#4B5563] mb-4">Calendar</h2>
                          <MiniCalendar assignments={assignments} onDayClick={(dayA) => setDayAssignments(dayA)} />
                        </div>

                        <UpcomingList assignments={assignments} days={14} />

                        {calendarConnected ? (
                          <button
                            onClick={() => setBulkSyncOpen(true)}
                            className="w-full flex items-center justify-center gap-2 rounded-xl border border-[#7DD3FC]/30 bg-[#0c1a2e] px-4 py-2.5 text-xs font-semibold text-[#7DD3FC] hover:border-[#7DD3FC]/50 transition"
                          >
                            <CalIconSvg className="h-3.5 w-3.5" />
                            Add All to Calendar
                          </button>
                        ) : (
                          <div className="rounded-xl border border-[#7DD3FC]/20 bg-[#0c1a2e] px-4 py-4">
                            <p className="text-xs font-semibold text-[#7DD3FC] mb-1">Sync with Google Calendar</p>
                            <p className="text-[11px] text-[#6B7280] mb-3">Add all assignments as calendar events in one click.</p>
                            <Link href="/settings" className="inline-flex items-center gap-1.5 rounded-lg bg-[#7DD3FC] px-3 py-1.5 text-xs font-semibold text-black hover:bg-[#38bdf8] transition">Connect →</Link>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center gap-5 py-24 text-center">
                    <div className="flex h-20 w-20 items-center justify-center rounded-2xl border border-[#1F1F1F] bg-[#111111]">
                      <svg className="h-9 w-9 text-[#4B5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
                      </svg>
                    </div>
                    <div>
                      <p className="text-base font-semibold text-white">No courses yet</p>
                      <p className="mt-1 text-sm text-[#6B7280]">Upload your first syllabus to get started</p>
                    </div>
                    <button onClick={openUpload} className="flex items-center gap-2 rounded-xl bg-[#4ADE80] px-5 py-2.5 text-sm font-semibold text-black hover:bg-[#22c55e] transition-colors">
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" /></svg>
                      Upload Syllabus
                    </button>
                  </div>
                )}
              </>
            )}
          </main>
        </div>
      </div>
    </>
  );
}
