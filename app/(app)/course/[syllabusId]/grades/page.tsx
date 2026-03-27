"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import useAssignments from "@/hooks/useAssignments";
import useGrades from "@/hooks/useGrades";
import { upsertGrade } from "@/lib/firebase/firestore";
import GradeRow from "@/components/grades/GradeRow";
import GradeSummaryCard from "@/components/grades/GradeSummaryCard";
import CourseTabs from "@/components/layout/CourseTabs";
import Spinner from "@/components/ui/Spinner";
import { calculateMinimumNeeded } from "@/lib/grades/calculator";
import type { TargetGrade } from "@/types";

const TARGET_OPTIONS: TargetGrade[] = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-"];

export default function GradesPage() {
  const params = useParams();
  const syllabusId = typeof params.syllabusId === "string" ? params.syllabusId : "";
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseAuth();

  const { assignments, loading: assignmentsLoading } = useAssignments(syllabusId, user?.uid);
  const {
    grades,
    currentGrade,
    letterGrade,
    loading: gradesLoading,
    setAssignmentsSeed,
    calculateProjectedGrade,
  } = useGrades(syllabusId, user?.uid);

  // What-if hypotheticals: assignmentId → percentage
  const [hypotheticals, setHypotheticals] = useState<Record<string, number>>({});
  const [targetGrade, setTargetGrade] = useState<TargetGrade>("B");
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Keep grades hook seeded with latest assignments
  useEffect(() => {
    setAssignmentsSeed(assignments);
  }, [assignments, setAssignmentsSeed]);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.assignmentId, g])), [grades]);

  const projectedGrade = useMemo(
    () => calculateProjectedGrade(hypotheticals),
    [hypotheticals, calculateProjectedGrade]
  );

  const minimumNeeded = useMemo(
    () => calculateMinimumNeeded(assignments, grades, targetGrade),
    [assignments, grades, targetGrade]
  );
  const minNeededMap = useMemo(
    () => new Map(minimumNeeded.map((m) => [m.assignmentId, m.minimumScore])),
    [minimumNeeded]
  );

  const handleGradeChange = useCallback(
    async (assignmentId: string, scoreEarned: number, scoreMax: number) => {
      if (!user) return;
      setSaving(assignmentId);
      try {
        const existing = gradeMap.get(assignmentId);
        await upsertGrade({
          gradeId: existing?.gradeId,
          assignmentId,
          syllabusId,
          userId: user.uid,
          scoreEarned,
          scoreMax,
          percentageScore: scoreMax > 0 ? (scoreEarned / scoreMax) * 100 : 0,
          targetGrade,
        });
        // Update hypotheticals so projection updates immediately
        const pct = scoreMax > 0 ? (scoreEarned / scoreMax) * 100 : 0;
        setHypotheticals((prev) => ({ ...prev, [assignmentId]: pct }));
      } finally {
        setSaving(null);
      }
    },
    [user, gradeMap, syllabusId, targetGrade]
  );

  const loading = authLoading || assignmentsLoading || gradesLoading;

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Spinner />
      </main>
    );
  }
  if (!user) return null;

  const hasGrades = grades.length > 0;
  const hasHypotheticals = Object.keys(hypotheticals).length > 0;

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
          <h1 className="text-2xl font-bold text-neutral-100">Grades</h1>
          <CourseTabs syllabusId={syllabusId} active="grades" />
        </div>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="mx-auto max-w-5xl px-4 py-8 space-y-6">
        {/* Summary cards */}
        <div className="grid gap-4 sm:grid-cols-2">
          <GradeSummaryCard
            currentGrade={currentGrade}
            letterGrade={letterGrade}
            progressLabel={
              hasGrades
                ? `Based on ${grades.length} graded assignment${grades.length !== 1 ? "s" : ""}`
                : "No grades logged yet"
            }
          />

          {/* Projected / What-if card */}
          <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="text-sm text-neutral-400 font-semibold">Projected Grade</div>
            <div className="mt-2 flex items-end gap-4">
              <div className="text-5xl font-extrabold text-neutral-100">
                {hasHypotheticals ? projectedGrade.toFixed(1) : "—"}
                {hasHypotheticals ? "%" : ""}
              </div>
            </div>
            <p className="mt-3 text-xs text-neutral-500">
              {hasHypotheticals
                ? "Includes what-if scores from your entries below."
                : "Enter hypothetical scores below to project your final grade."}
            </p>
          </div>
        </div>

        {/* Target grade selector + minimum needed */}
        <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 p-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-sm font-semibold text-neutral-100">Target Grade</h2>
              <p className="text-xs text-neutral-500 mt-0.5">
                See the minimum score you need on each remaining assignment.
              </p>
            </div>
            <select
              aria-label="Target grade"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value as TargetGrade)}
              className="rounded-lg border border-neutral-700 bg-neutral-800/60 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-[#7DD3FC]/20"
            >
              {TARGET_OPTIONS.map((g) => (
                <option key={g} value={g}>{g}</option>
              ))}
            </select>
          </div>

          {minimumNeeded.length > 0 && (
            <div className="mt-4 rounded-xl border border-neutral-800 bg-neutral-900/40 divide-y divide-neutral-800">
              {minimumNeeded.map(({ assignmentId, minimumScore }) => {
                const a = assignments.find((x) => x.assignmentId === assignmentId);
                if (!a) return null;
                const ok = minimumScore <= 100;
                return (
                  <div key={assignmentId} className="flex items-center justify-between px-4 py-3 gap-2">
                    <span className="text-sm text-neutral-200 truncate">{a.title}</span>
                    <span
                      className={[
                        "text-xs font-semibold px-2 py-1 rounded-full border whitespace-nowrap",
                        ok
                          ? "border-green-400/40 text-green-200 bg-green-500/10"
                          : "border-red-400/40 text-red-200 bg-red-500/10",
                      ].join(" ")}
                    >
                      Need {minimumScore.toFixed(0)}%{!ok ? " (impossible)" : ""}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {minimumNeeded.length === 0 && grades.length === assignments.length && assignments.length > 0 && (
            <p className="mt-3 text-xs text-neutral-500">All assignments have been graded.</p>
          )}
        </div>

        {/* Per-assignment grade entry */}
        <div>
          <h2 className="text-base font-semibold text-neutral-100 mb-3">Log Grades</h2>
          {assignments.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/20 py-10 flex flex-col items-center gap-2 text-center">
              <p className="text-sm text-neutral-400">No assignments yet</p>
              <p className="text-xs text-neutral-600">Upload and process a syllabus first.</p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {assignments.map((assignment) => {
                const existing = gradeMap.get(assignment.assignmentId);
                return (
                  <div key={assignment.assignmentId} className="relative">
                    {saving === assignment.assignmentId && (
                      <div className="absolute top-2 right-2 z-10">
                        <Spinner size="sm" />
                      </div>
                    )}
                    <GradeRow
                      assignment={assignment}
                      initialEarned={existing?.scoreEarned ?? 0}
                      initialMax={existing?.scoreMax ?? 100}
                      targetGrade={targetGrade}
                      minScoreNeeded={minNeededMap.get(assignment.assignmentId)}
                      onChange={({ scoreEarned, scoreMax }) =>
                        void handleGradeChange(assignment.assignmentId, scoreEarned, scoreMax)
                      }
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
