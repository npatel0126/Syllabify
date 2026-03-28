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

export default function CourseOverviewPage() {
  const params = useParams();
  const syllabusId = typeof params.syllabusId === "string" ? params.syllabusId : "";
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseAuth();

  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);
  const [syllabusLoading, setSyllabusLoading] = useState(true);

  const { assignments, loading: assignmentsLoading } = useAssignments(syllabusId, user?.uid);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

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
