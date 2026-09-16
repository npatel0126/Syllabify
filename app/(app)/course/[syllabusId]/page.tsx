"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { onSnapshot, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import useAssignments from "@/hooks/useAssignments";
import { updateAssignment } from "@/lib/firebase/firestore";
import AssignmentRow from "@/components/syllabus/AssignmentRow";
import CourseTabs from "@/components/layout/CourseTabs";
import Spinner from "@/components/ui/Spinner";
import type { Syllabus } from "@/types";
import type { Timestamp } from "firebase/firestore";

/** Thin bar showing a grade-weight percentage — uses <meter> so no inline styles needed. */
function GradeBar({ weight }: { weight: number }) {
  const pct = Math.min(100, Math.max(0, weight));
  return (
    <meter
      className="grade-meter bar-green"
      value={pct}
      min={0}
      max={100}
      aria-label={`${pct}% of grade`}
    />
  );
}

/** A single labelled info row in the Instructor card. */
function InfoRow({
  label,
  value,
  href,
  icon,
  className = "",
}: {
  label: string;
  value: string;
  href?: string;
  icon: "person" | "email" | "phone" | "location" | "clock";
  className?: string;
}) {
  const icons: Record<typeof icon, React.ReactNode> = {
    person: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
      </svg>
    ),
    email: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 0 1-2.25 2.25h-15a2.25 2.25 0 0 1-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0 0 19.5 4.5h-15a2.25 2.25 0 0 0-2.25 2.25m19.5 0v.243a2.25 2.25 0 0 1-1.07 1.916l-7.5 4.615a2.25 2.25 0 0 1-2.36 0L3.32 8.91a2.25 2.25 0 0 1-1.07-1.916V6.75" />
      </svg>
    ),
    phone: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-.282.376-.769.542-1.21.38a12.035 12.035 0 0 1-7.143-7.143c-.162-.441.004-.928.38-1.21l1.293-.97c.363-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 0 0-1.091-.852H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
      </svg>
    ),
    location: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1 1 15 0Z" />
      </svg>
    ),
    clock: (
      <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  };

  const content = (
    <div className={`flex flex-col gap-0.5 ${className}`}>
      <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest text-neutral-500">
        {icons[icon]}
        {label}
      </span>
      <span className={`text-sm text-neutral-200 ${href ? "hover:text-[#7DD3FC] transition-colors" : ""}`}>
        {value}
      </span>
    </div>
  );

  if (href) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{content}</a>;
  }
  return content;
}

export default function CourseOverviewPage() {
  const params = useParams();
  const syllabusId = typeof params.syllabusId === "string" ? params.syllabusId : "";
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseAuth();

  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [syllabusLoading, setSyllabusLoading] = useState(true);
  const [reprocessing, setReprocessing] = useState(false);
  const [reprocessMsg, setReprocessMsg] = useState<string | null>(null);

  const { assignments, loading: assignmentsLoading } = useAssignments(syllabusId, user?.uid);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  async function handleReprocess() {
    if (!user || reprocessing) return;
    setReprocessing(true);
    setReprocessMsg(null);
    try {
      const idToken = await user.getIdToken();
      const res = await fetch("/api/reprocess-syllabus", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${idToken}` },
        body: JSON.stringify({ syllabusId }),
      });
      const json = await res.json();
      if (!res.ok) setReprocessMsg(json.error ?? "Failed to reprocess.");
      else setReprocessMsg("Re-extracting… check back in a moment.");
    } catch {
      setReprocessMsg("Network error. Try again.");
    } finally {
      setReprocessing(false);
    }
  }

  // Real-time syllabus listener
  useEffect(() => {
    if (!syllabusId) return;
    setSyllabusLoading(true);
    const unsub = onSnapshot(doc(db, "syllabi", syllabusId), (snap) => {
      if (snap.exists()) setSyllabus({ syllabusId: snap.id, ...snap.data() } as Syllabus);
      setSyllabusLoading(false);
    });
    return () => unsub();
  }, [syllabusId]);

  const handleConfirmDueDate = useCallback(async (assignmentId: string, dueDate: Date) => {
    await updateAssignment(assignmentId, {
      dueDate: dueDate as unknown as Timestamp,
      dueDateConfirmed: true,
    });
  }, []);

  if (authLoading || syllabusLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Spinner />
      </main>
    );
  }
  if (!user) return null;

  const isProcessing = syllabus?.status === "processing" || syllabus?.status === "uploading";
  const isError = syllabus?.status === "error";
  const errorMessage = (syllabus as (Syllabus & { errorMessage?: string }) | null)?.errorMessage;
  const gradeBreakdown = (syllabus as (Syllabus & { gradeBreakdown?: Record<string, number> }) | null)
    ?.gradeBreakdown ?? {};
  const hasBreakdown = Object.keys(gradeBreakdown).length > 0;

  // Extended metadata from AI extraction
  const meta = syllabus as (Syllabus & {
    gradeBreakdown?: Record<string, number>;
    errorMessage?: string;
    courseCode?: string;
    professorEmail?: string;
    professorPhone?: string;
    officeHours?: string;
    officeLocation?: string;
  }) | null;
  const hasProfInfo = !!(meta?.professor || meta?.professorEmail || meta?.officeHours || meta?.officeLocation || meta?.professorPhone);

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-800 bg-neutral-900/30 px-4 pt-8 pb-0">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>

          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h1 className="text-2xl font-bold text-neutral-100">
                {syllabus?.courseName || "Course"}
              </h1>
              <div className="mt-1 flex items-center gap-3 flex-wrap">
                {meta?.courseCode && (
                  <span className="text-sm font-mono text-neutral-400">{meta.courseCode}</span>
                )}
                {syllabus?.professor && (
                  <span className="text-sm text-neutral-400">{syllabus.professor}</span>
                )}
                {syllabus?.semester && (
                  <span className="text-xs rounded-full border border-neutral-700 bg-neutral-800/40 px-2 py-0.5 text-neutral-300">
                    {syllabus.semester}
                  </span>
                )}
              </div>
            </div>

            {isProcessing && (
              <div className="flex items-center gap-2 rounded-full border border-[#4ADE80]/30 bg-[#052e16] px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
                <span className="text-xs font-semibold text-[#4ADE80]">Processing…</span>
              </div>
            )}
            {isError && (
              <div className="flex items-center gap-2 rounded-full border border-red-400/30 bg-red-950/30 px-3 py-1.5">
                <span className="h-2 w-2 rounded-full bg-red-400" />
                <span className="text-xs font-semibold text-red-300">Extraction failed</span>
              </div>
            )}
            {/* Re-extract button — shown when ready but info might be stale */}
            {syllabus?.status === "ready" && (
              <button
                onClick={() => void handleReprocess()}
                disabled={reprocessing}
                title="Re-run AI extraction to refresh professor info and assignments"
                className="flex items-center gap-1.5 rounded-full border border-neutral-700 bg-neutral-800/40 px-3 py-1.5 text-xs text-neutral-400 hover:text-neutral-200 hover:border-neutral-600 transition disabled:opacity-50"
              >
                <svg className={`h-3 w-3 ${reprocessing ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99" />
                </svg>
                {reprocessing ? "Re-extracting…" : "Re-extract info"}
              </button>
            )}
            {reprocessMsg && (
              <span className="text-xs text-[#4ADE80]">{reprocessMsg}</span>
            )}
          </div>

          <CourseTabs syllabusId={syllabusId} active="overview" />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-8">
        {isProcessing && (
          <div className="mb-6 rounded-xl border border-[#4ADE80]/20 bg-[#052e16]/60 px-4 py-4 flex items-center gap-3">
            <Spinner size="sm" />
            <div>
              <p className="text-sm font-semibold text-[#4ADE80]">Extracting assignments…</p>
              <p className="text-xs text-neutral-400 mt-0.5">
                GPT-4o is reading your syllabus. This usually takes under a minute.
              </p>
            </div>
          </div>
        )}

        {isError && (
          <div className="mb-6 rounded-xl border border-red-400/20 bg-red-950/30 px-4 py-4">
            <p className="text-sm font-semibold text-red-300">Could not extract assignments</p>
            <p className="text-xs text-neutral-400 mt-1">
              There was an error processing your PDF. Try re-uploading from the dashboard.
            </p>
            {errorMessage && (
              <p className="text-xs text-red-400/70 mt-2 font-mono">{errorMessage}</p>
            )}
          </div>
        )}

        {/* ── Professor / Contact Info card ── */}
        {hasProfInfo && !isProcessing && (
          <div className="mb-6 rounded-2xl border border-neutral-800 bg-neutral-900/20">
            <div className="px-5 py-4 border-b border-neutral-800 flex items-center gap-2">
              <svg className="h-4 w-4 text-neutral-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z" />
              </svg>
              <h2 className="text-base font-semibold text-neutral-100">Instructor</h2>
            </div>
            <div className="px-5 py-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
              {meta?.professor && (
                <InfoRow icon="person" label="Name" value={meta.professor} />
              )}
              {meta?.professorEmail && (
                <InfoRow icon="email" label="Email" value={meta.professorEmail} href={`mailto:${meta.professorEmail}`} />
              )}
              {meta?.professorPhone && (
                <InfoRow icon="phone" label="Phone" value={meta.professorPhone} href={`tel:${meta.professorPhone}`} />
              )}
              {meta?.officeLocation && (
                <InfoRow icon="location" label="Office" value={meta.officeLocation} />
              )}
              {meta?.officeHours && (
                <InfoRow icon="clock" label="Office Hours" value={meta.officeHours} className="sm:col-span-2" />
              )}
            </div>
          </div>
        )}

        {/* Assignments list */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20">
          <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
            <h2 className="text-base font-semibold text-neutral-100">Assignments</h2>
            <span className="text-xs text-neutral-500">
              {assignments.length} item{assignments.length !== 1 ? "s" : ""}
            </span>
          </div>

          <div className="px-5">
            {assignmentsLoading && (
              <div className="py-8 flex justify-center"><Spinner /></div>
            )}

            {!assignmentsLoading && assignments.length === 0 && !isProcessing && (
              <div className="py-12 flex flex-col items-center gap-3 text-center">
                <div className="h-12 w-12 rounded-full border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                  <svg className="h-6 w-6 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <p className="text-sm text-neutral-400">No assignments found</p>
                <p className="text-xs text-neutral-600 max-w-xs">
                  Assignments will appear here once your syllabus finishes processing.
                </p>
              </div>
            )}

            {!assignmentsLoading && assignments.length > 0 &&
              assignments.map((a) => (
                <AssignmentRow
                  key={a.assignmentId}
                  assignment={a}
                  onConfirmDueDate={handleConfirmDueDate}
                />
              ))
            }
          </div>
        </div>

        {/* Grade breakdown */}
        {hasBreakdown && (
          <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/20">
            <div className="px-5 py-4 border-b border-neutral-800">
              <h2 className="text-base font-semibold text-neutral-100">Grade Breakdown</h2>
              <p className="text-xs text-neutral-500 mt-0.5">As extracted from your syllabus</p>
            </div>
            <div className="px-5 py-1 divide-y divide-neutral-800">
              {Object.entries(gradeBreakdown).map(([category, weight]) => (
                <div key={category} className="flex items-center justify-between py-3">
                  <span className="text-sm text-neutral-200 capitalize">{category}</span>
                  <div className="flex items-center gap-3">
                    <GradeBar weight={Number(weight)} />
                    <span className="text-sm font-semibold text-neutral-100 w-10 text-right">{weight}%</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
