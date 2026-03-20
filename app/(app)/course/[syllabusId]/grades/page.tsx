"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import useAssignments from "@/hooks/useAssignments";
import useGrades from "@/hooks/useGrades";
import CourseTabs from "@/components/layout/CourseTabs";
import GradeSummaryCard from "@/components/grades/GradeSummaryCard";
import GradeRow from "@/components/grades/GradeRow";
import WhatIfCalculator from "@/components/grades/WhatIfCalculator";
import type { Assignment, Grade, TargetGrade } from "@/types";

const targetLetters: TargetGrade[] = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-"];

export default function CourseGradesPage() {
  const router = useRouter();
  const params = useParams<{ syllabusId: string }>();
  const syllabusId = params?.syllabusId;
  const { user, loading } = useAuth();

  const userId = user?.userId;
  const { assignments, loading: assignmentsLoading } = useAssignments(syllabusId, userId);
  const { grades, currentGrade, letterGrade, loading: gradesLoading, setAssignmentsSeed } = useGrades(syllabusId, userId);

  const [targetGrade, setTargetGrade] = useState<TargetGrade>("A-");

  useEffect(() => {
    setAssignmentsSeed(assignments as Assignment[]);
  }, [assignments, setAssignmentsSeed]);

  const gradeByAssignmentId = useMemo(() => {
    const map = new Map<string, Grade>();
    for (const g of grades) map.set(g.assignmentId, g);
    return map;
  }, [grades]);

  const onScoreChange = async (assignmentId: string, scoreEarned: number, scoreMax: number) => {
    // TODO: Persist via `lib/firebase/firestore.ts` `upsertGrade`.
    void assignmentId;
    void scoreEarned;
    void scoreMax;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-blue/40 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId || !syllabusId) {
    router.replace("/login");
    return null;
  }

  const isLoading = assignmentsLoading || gradesLoading;

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-3xl font-extrabold text-neutral-100">Grades</div>
            <div className="text-sm text-neutral-400 mt-1">Track scores and run what-if scenarios.</div>
          </div>
        </div>

        <CourseTabs syllabusId={syllabusId} active="grades" />

        <div className="mt-6">
          {isLoading ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 text-neutral-400">Loading grade data...</div>
          ) : (
            <GradeSummaryCard
              currentGrade={currentGrade}
              letterGrade={letterGrade}
              progressLabel="TODO: show progress to next letter grade"
            />
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-neutral-100 font-bold">Target grade</div>
              <div className="text-sm text-neutral-400">Choose the letter grade you’re aiming for.</div>
            </div>
            <label className="flex items-center gap-3">
              <span className="text-sm font-semibold text-neutral-200">Target</span>
              <select
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value as TargetGrade)}
                className="rounded-xl bg-neutral-800/40 border border-neutral-700 px-4 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-primary-blue/25"
              >
                {targetLetters.map((t) => (
                  <option key={t} value={t} className="bg-neutral-950">
                    {t}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-4 text-xs text-neutral-500">TODO: Persist target grade in Firestore and recompute minimums.</div>
        </div>

        <div className="mt-6">
          <h2 className="text-xl font-bold text-neutral-100">Assignments</h2>
          <div className="mt-4 space-y-3">
            {assignments.map((a) => {
              const g = gradeByAssignmentId.get(a.assignmentId);
              return (
                <GradeRow
                  key={a.assignmentId}
                  assignment={a}
                  initialEarned={g?.scoreEarned ?? 0}
                  initialMax={g?.scoreMax ?? 100}
                  targetGrade={targetGrade}
                  // TODO: derive minScoreNeeded from calculator.minimumNeeded
                  minScoreNeeded={undefined}
                  onChange={(payload) => void onScoreChange(a.assignmentId, payload.scoreEarned, payload.scoreMax)}
                />
              );
            })}
            {assignments.length === 0 ? <div className="text-sm text-neutral-500">No assignments loaded.</div> : null}
          </div>
        </div>

        <div className="mt-8">
          <WhatIfCalculator assignments={assignments} targetGrade={targetGrade} />
          <div className="mt-4 text-xs text-neutral-500">TODO: Add “at risk” banner when target grade is mathematically impossible.</div>
        </div>
      </main>
    </div>
  );
}

