"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import useAssignments from "@/hooks/useAssignments";
import useGrades from "@/hooks/useGrades";
import { upsertGrade, addAssignment, deleteAssignment } from "@/lib/firebase/firestore";
import CourseTabs from "@/components/layout/CourseTabs";
import Spinner from "@/components/ui/Spinner";
import {
  calculateMinimumNeeded,
  calculateProjectedGrade,
  calculateWeightedGrade,
  percentageToLetterGrade,
  letterGradeToMinPercentage,
} from "@/lib/grades/calculator";
import type { Assignment, AssignmentType, TargetGrade } from "@/types";


const TARGET_OPTIONS: TargetGrade[] = ["A+", "A", "A-", "B+", "B", "B-", "C+", "C", "C-"];

// ── helpers ───────────────────────────────────────────────────────────────────
function gradeColor(pct: number) {
  if (pct >= 90) return "text-[#4ADE80]";
  if (pct >= 80) return "text-[#86EFAC]";
  if (pct >= 70) return "text-[#FCD34D]";
  if (pct >= 60) return "text-[#FB923C]";
  return "text-red-400";
}

function barColor(pct: number) {
  if (pct >= 80) return "bar-green";
  if (pct >= 70) return "bar-yellow";
  if (pct >= 60) return "bar-orange";
  return "bar-red";
}

// ── progress bar — uses <meter> so zero inline styles are needed ──────────────
// Styled entirely via .grade-meter in globals.css
function ProgressBar({ value, max = 100, colorClass }: { value: number; max?: number; colorClass: string }) {
  return (
    <meter
      className={`grade-meter ${colorClass}`}
      value={Math.min(value, max)}
      min={0}
      max={max}
      aria-label={`${value.toFixed(0)} of ${max}`}
    />
  );
}

// ── inline grade input cell ───────────────────────────────────────────────────
function GradeCell({
  value,
  onChange,
  onCommit,
  placeholder = "—",
  className = "",
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit?: () => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <input
      type="number"
      min={0}
      max={100}
      step={0.5}
      value={value}
      placeholder={placeholder}
      title="Grade percentage"
      onChange={(e) => onChange(e.target.value)}
      onBlur={onCommit}
      onKeyDown={(e) => { if (e.key === "Enter") { e.currentTarget.blur(); } }}
      className={[
        "w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-2 py-1.5 text-center text-sm text-white",
        "focus:outline-none focus:border-[#4ADE80]/60 placeholder:text-[#4B5563]",
        "transition [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none",
        className,
      ].join(" ")}
    />
  );
}

// ── Add custom row modal ──────────────────────────────────────────────────────
function AddCustomModal({
  onAdd,
  onClose,
  totalWeight,
}: {
  onAdd: (title: string, weight: number, type: AssignmentType) => Promise<void>;
  onClose: () => void;
  totalWeight: number;
}) {
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState("");
  const [type, setType] = useState<AssignmentType>("homework");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit() {
    const w = parseFloat(weight);
    if (!title.trim()) return setErr("Title is required.");
    if (isNaN(w) || w <= 0) return setErr("Enter a valid weight > 0.");
    if (totalWeight + w > 100.5) return setErr(`Total weight would exceed 100% (currently ${totalWeight.toFixed(1)}% used).`);
    setSaving(true);
    setErr("");
    try {
      await onAdd(title.trim(), w, type);
      onClose();
    } catch {
      setErr("Failed to add entry.");
      setSaving(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="w-full max-w-sm rounded-2xl border border-[#1F1F1F] bg-[#111111] p-6 shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-white">Add Grade Entry</h2>
          <button onClick={onClose} title="Close" className="rounded-lg p-1.5 text-[#6B7280] hover:bg-[#1F1F1F] hover:text-white transition">
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          <div>
            <label className="text-xs text-[#6B7280] mb-1 block">Title</label>
            <input
              ref={inputRef}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && void submit()}
              placeholder="e.g. Midterm Extra Credit"
              className="w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#4ADE80]/50"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Weight (%)</label>
              <input
                type="number"
                min={0.1}
                max={100}
                step={0.5}
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                placeholder="e.g. 10"
                title="Grade weight percentage"
                className="w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2 text-sm text-white placeholder:text-[#4B5563] focus:outline-none focus:border-[#4ADE80]/50"
              />
            </div>
            <div>
              <label className="text-xs text-[#6B7280] mb-1 block">Type</label>
              <select
                value={type}
                onChange={(e) => setType(e.target.value as AssignmentType)}
                aria-label="Assignment type"
                className="w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-3 py-2 text-sm text-white focus:outline-none focus:border-[#4ADE80]/50"
              >
                <option value="exam">Exam</option>
                <option value="quiz">Quiz</option>
                <option value="homework">Homework</option>
                <option value="paper">Paper</option>
                <option value="lab">Lab</option>
                <option value="term test">Term Test</option>
              </select>
            </div>
          </div>
          {err && <p className="text-xs text-red-400">{err}</p>}
        </div>

        <div className="mt-5 flex gap-3">
          <button onClick={onClose} className="flex-1 rounded-xl border border-[#1F1F1F] py-2.5 text-sm text-[#9CA3AF] hover:bg-[#1F1F1F] transition">
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={saving}
            className="flex-1 rounded-xl bg-[#4ADE80] py-2.5 text-sm font-semibold text-black hover:bg-[#22c55e] transition disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving && <span className="h-3.5 w-3.5 rounded-full border-2 border-black/30 border-t-black animate-spin" />}
            {saving ? "Adding…" : "Add"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── main page ─────────────────────────────────────────────────────────────────
export default function GradesPage() {
  const params = useParams();
  const syllabusId = typeof params.syllabusId === "string" ? params.syllabusId : "";
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseAuth();

  const { assignments, loading: assignmentsLoading } = useAssignments(syllabusId, user?.uid);
  const { grades, loading: gradesLoading, setAssignmentsSeed } = useGrades(syllabusId, user?.uid);

  // local grade inputs: assignmentId → percentage string
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [targetGrade, setTargetGrade] = useState<TargetGrade>("B");
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    setAssignmentsSeed(assignments);
  }, [assignments, setAssignmentsSeed]);

  // Seed inputs from saved grades when they load
  useEffect(() => {
    setInputs((prev) => {
      const next = { ...prev };
      for (const g of grades) {
        if (!(g.assignmentId in next)) {
          next[g.assignmentId] = g.percentageScore.toFixed(1);
        }
      }
      return next;
    });
  }, [grades]);

  const gradeMap = useMemo(() => new Map(grades.map((g) => [g.assignmentId, g])), [grades]);

  // Save a grade when the user commits (blur / enter)
  const saveGrade = useCallback(async (assignment: Assignment, pctStr: string) => {
    if (!user) return;
    const pct = parseFloat(pctStr);
    if (isNaN(pct)) return;
    const clampedPct = Math.max(0, Math.min(100, pct));
    setSavingId(assignment.assignmentId);
    try {
      const existing = gradeMap.get(assignment.assignmentId);
      await upsertGrade({
        gradeId: existing?.gradeId,
        assignmentId: assignment.assignmentId,
        syllabusId,
        userId: user.uid,
        scoreEarned: clampedPct,
        scoreMax: 100,
        percentageScore: clampedPct,
        targetGrade,
      });
    } finally {
      setSavingId(null);
    }
  }, [user, gradeMap, syllabusId, targetGrade]);

  const handleAddCustom = useCallback(async (title: string, weight: number, type: AssignmentType) => {
    if (!user) return;
    await addAssignment({
      syllabusId,
      userId: user.uid,
      title,
      type,
      gradeWeight: weight,
      notes: "",
      isCustom: true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      dueDate: null as any,
      dueDateConfirmed: false,
      calendarEventId: "",
      reminderTaskIds: [],
    });
  }, [user, syllabusId]);

  const handleDeleteCustom = useCallback(async (assignmentId: string) => {
    setInputs((prev) => { const n = { ...prev }; delete n[assignmentId]; return n; });
    await deleteAssignment(assignmentId);
  }, []);

  // ── computed values ───────────────────────────────────────────────────────
  const totalWeightUsed = useMemo(
    () => assignments.reduce((s, a) => s + (a.gradeWeight ?? 0), 0),
    [assignments]
  );

  // Build the "graded" inputs map for calculations (use saved grade pct)
  const gradedInputs = useMemo(() => {
    const map: Record<string, number> = {};
    for (const [id, str] of Object.entries(inputs)) {
      const n = parseFloat(str);
      if (!isNaN(n)) map[id] = Math.max(0, Math.min(100, n));
    }
    return map;
  }, [inputs]);

  const currentGrade = useMemo(
    () => calculateWeightedGrade(assignments, grades),
    [assignments, grades]
  );

  const projectedGrade = useMemo(
    () => calculateProjectedGrade(assignments, grades, gradedInputs),
    [assignments, grades, gradedInputs]
  );

  const letterGrade = useMemo(() => percentageToLetterGrade(projectedGrade || currentGrade), [projectedGrade, currentGrade]);

  const minNeededList = useMemo(
    () => calculateMinimumNeeded(assignments, grades, targetGrade),
    [assignments, grades, targetGrade]
  );
  const minNeededMap = useMemo(
    () => new Map(minNeededList.map((m) => [m.assignmentId, m.minimumScore])),
    [minNeededList]
  );

  // Group assignments by type for the table sections
  const grouped = useMemo(() => {
    const map = new Map<string, Assignment[]>();
    for (const a of assignments) {
      const key = a.type ?? "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(a);
    }
    return map;
  }, [assignments]);

  const typeLabel: Record<string, string> = {
    exam: "Exams",
    quiz: "Quizzes",
    homework: "Homework",
    paper: "Papers",
    lab: "Labs",
    "term test": "Term Tests",
    other: "Other",
  };

  const loading = authLoading || assignmentsLoading || gradesLoading;
  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Spinner />
      </main>
    );
  }
  if (!user) return null;

  const displayGrade = projectedGrade || currentGrade;
  const hasAnyInput = Object.keys(gradedInputs).length > 0;

  return (
    <main className="min-h-screen bg-[#0A0A0A]">
      {showAddModal && (
        <AddCustomModal
          totalWeight={totalWeightUsed}
          onAdd={handleAddCustom}
          onClose={() => setShowAddModal(false)}
        />
      )}

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="border-b border-[#1F1F1F] bg-[#0A0A0A] px-4 pt-8 pb-0">
        <div className="mx-auto max-w-4xl">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 flex items-center gap-1 text-xs text-[#6B7280] hover:text-[#D1D5DB] transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <h1 className="text-xl font-bold text-white">Grades</h1>
          <CourseTabs syllabusId={syllabusId} active="grades" />
        </div>
      </div>

      <div className="mx-auto max-w-4xl px-4 py-8 space-y-6">

        {/* ── Summary strip ─────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Current / Projected */}
          <div className="col-span-2 rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5 flex items-center gap-5">
            <div>
              <p className="text-xs text-[#6B7280] font-medium">
                {hasAnyInput ? "Projected Grade" : "Current Grade"}
              </p>
              <p className={`text-5xl font-extrabold mt-1 ${gradeColor(displayGrade)}`}>
                {hasAnyInput ? displayGrade.toFixed(1) : (grades.length > 0 ? currentGrade.toFixed(1) : "—")}
                {hasAnyInput || grades.length > 0 ? "%" : ""}
              </p>
            </div>
            <div className="h-14 w-px bg-[#1F1F1F]" />
            <div>
              <p className="text-xs text-[#6B7280] font-medium">Letter</p>
              <p className={`text-4xl font-extrabold mt-1 ${gradeColor(displayGrade)}`}>
                {(hasAnyInput || grades.length > 0) ? letterGrade : "—"}
              </p>
            </div>
          </div>

          {/* Weight coverage */}
          <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5">
            <p className="text-xs text-[#6B7280] font-medium">Weight Tracked</p>
            <p className="text-3xl font-bold text-white mt-1">{totalWeightUsed.toFixed(0)}%</p>
            <div className="mt-2 h-1.5 rounded-full bg-[#1F1F1F] overflow-hidden">
              <ProgressBar value={totalWeightUsed} colorClass="bar-green" />
            </div>
          </div>

          {/* Target grade */}
          <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] p-5">
            <p className="text-xs text-[#6B7280] font-medium mb-2">Target Grade</p>
            <select
              aria-label="Target grade"
              value={targetGrade}
              onChange={(e) => setTargetGrade(e.target.value as TargetGrade)}
              className="w-full rounded-lg border border-[#1F1F1F] bg-[#0A0A0A] px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#7DD3FC]/50"
            >
              {TARGET_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>
            <p className="mt-2 text-[10px] text-[#4B5563]">
              Need ≥ {letterGradeToMinPercentage(targetGrade)}% overall
            </p>
          </div>
        </div>

        {/* ── Grade table ───────────────────────────────────────────────── */}
        {assignments.length === 0 ? (
          <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] py-16 flex flex-col items-center gap-3 text-center">
            <svg className="h-10 w-10 text-[#4B5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.3}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25Z" />
            </svg>
            <p className="text-sm text-white font-medium">No assignments yet</p>
            <p className="text-xs text-[#6B7280]">Upload and process a syllabus first, or add a custom entry below.</p>
            <button
              onClick={() => setShowAddModal(true)}
              className="mt-2 flex items-center gap-2 rounded-xl bg-[#4ADE80] px-4 py-2 text-xs font-semibold text-black hover:bg-[#22c55e] transition"
            >
              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
              </svg>
              Add Entry
            </button>
          </div>
        ) : (
          <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] overflow-hidden">
            {/* table header */}
            <div className="grid grid-cols-[1fr_80px_90px_90px_90px_32px] gap-x-2 px-4 py-2.5 border-b border-[#1F1F1F] bg-[#0D0D0D]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4B5563]">Assignment</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4B5563] text-center">Weight</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4B5563] text-center">Grade %</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4B5563] text-center">Weighted</span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-[#4B5563] text-center">Need</span>
              <span />
            </div>

            {/* sections by type */}
            {Array.from(grouped.entries()).map(([type, items]) => {
              const sectionWeight = items.reduce((s, a) => s + (a.gradeWeight ?? 0), 0);
              return (
                <div key={type} className="border-b border-[#1F1F1F] last:border-b-0">
                  {/* section label */}
                  <div className="px-4 py-2 bg-[#0D0D0D] flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-widest text-[#6B7280]">
                      {typeLabel[type] ?? type}
                    </span>
                    <span className="text-[10px] text-[#4B5563]">{sectionWeight.toFixed(1)}% of grade</span>
                  </div>

                  {/* rows */}
                  {items.map((a) => {
                    const inputVal = inputs[a.assignmentId] ?? "";
                    const pct = parseFloat(inputVal);
                    const hasPct = !isNaN(pct);
                    const weightedContrib = hasPct ? (pct / 100) * a.gradeWeight : null;
                    const needed = minNeededMap.get(a.assignmentId);
                    const isSaving = savingId === a.assignmentId;

                    return (
                      <div
                        key={a.assignmentId}
                        className="grid grid-cols-[1fr_80px_90px_90px_90px_32px] gap-x-2 items-center px-4 py-2.5 border-b border-[#1F1F1F]/50 last:border-b-0 hover:bg-[#111111] group transition"
                      >
                        {/* title */}
                        <div className="min-w-0">
                          <p className="text-sm text-white truncate">{a.title}</p>
                          {a.isCustom && (
                            <span className="text-[9px] text-[#4B5563] font-medium uppercase tracking-wider">custom</span>
                          )}
                        </div>

                        {/* weight */}
                        <div className="text-center">
                          <span className="text-xs text-[#9CA3AF]">{a.gradeWeight.toFixed(1)}%</span>
                        </div>

                        {/* grade input */}
                        <div className="relative">
                          <GradeCell
                            value={inputVal}
                            placeholder="—"
                            onChange={(v) => setInputs((prev) => ({ ...prev, [a.assignmentId]: v }))}
                            onCommit={() => void saveGrade(a, inputs[a.assignmentId] ?? "")}
                            className={hasPct ? gradeColor(pct) : ""}
                          />
                          {isSaving && (
                            <span className="absolute right-1.5 top-1/2 -translate-y-1/2">
                              <span className="h-2.5 w-2.5 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin block" />
                            </span>
                          )}
                        </div>

                        {/* weighted contribution */}
                        <div className="text-center">
                          {weightedContrib !== null ? (
                            <span className={`text-xs font-medium ${gradeColor(pct)}`}>
                              {weightedContrib.toFixed(2)}%
                            </span>
                          ) : (
                            <span className="text-xs text-[#4B5563]">—</span>
                          )}
                        </div>

                        {/* needed */}
                        <div className="text-center">
                          {needed !== undefined ? (
                            <span className={`text-xs font-medium ${needed <= 100 ? "text-[#7DD3FC]" : "text-red-400"}`}>
                              {needed.toFixed(0)}%{needed > 100 ? "!" : ""}
                            </span>
                          ) : hasPct ? (
                            <svg className="h-3.5 w-3.5 text-[#4ADE80] mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
                            </svg>
                          ) : (
                            <span className="text-xs text-[#4B5563]">—</span>
                          )}
                        </div>

                        {/* delete (custom only) */}
                        <div className="flex justify-center">
                          {a.isCustom ? (                            <button
                              onClick={() => void handleDeleteCustom(a.assignmentId)}
                              className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-[#4B5563] hover:text-red-400 transition"
                              title="Remove entry"
                            >
                              <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}

            {/* ── progress bar footer ─────────────────────────────────────── */}
            {hasAnyInput && (
              <div className="px-4 py-3 bg-[#0D0D0D] flex items-center gap-3">
                <div className="flex-1">
                  <ProgressBar
                    value={projectedGrade}
                    colorClass={
                      projectedGrade >= 80 ? "bar-green"
                      : projectedGrade >= 70 ? "bar-yellow"
                      : projectedGrade >= 60 ? "bar-orange"
                      : "bar-red"
                    }
                  />
                </div>
                <span className={`text-xs font-semibold ${gradeColor(projectedGrade)}`}>
                  {projectedGrade.toFixed(1)}%
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Save hint + Add row ───────────────────────────────────────── */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-xs text-[#4B5563]">
            Type a grade % and press <kbd className="rounded border border-[#1F1F1F] bg-[#111111] px-1 py-0.5 text-[10px] text-[#6B7280]">Enter</kbd> or click away to save.
          </p>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 rounded-xl border border-[#1F1F1F] bg-[#111111] px-4 py-2 text-xs font-medium text-[#9CA3AF] hover:border-[#4ADE80]/30 hover:text-[#4ADE80] transition"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            Add Custom Entry
          </button>
        </div>

        {/* ── Minimum needed breakdown ──────────────────────────────────── */}
        {minNeededList.length > 0 && (
          <div className="rounded-2xl border border-[#1F1F1F] bg-[#111111] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#1F1F1F] bg-[#0D0D0D]">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-[#4B5563]">
                Needed to reach {targetGrade}
              </h2>
            </div>
            <div className="divide-y divide-[#1F1F1F]">
              {minNeededList.map(({ assignmentId, minimumScore }) => {
                const a = assignments.find((x) => x.assignmentId === assignmentId);
                if (!a) return null;
                const impossible = minimumScore > 100;
                return (
                  <div key={assignmentId} className="flex items-center justify-between px-4 py-3 gap-2">
                    <span className="text-sm text-[#D1D5DB] truncate">{a.title}</span>
                    <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border whitespace-nowrap ${
                      impossible
                        ? "border-red-500/30 text-red-400 bg-red-950/40"
                        : "border-[#7DD3FC]/30 text-[#7DD3FC] bg-[#0c1a2e]"
                    }`}>
                      {impossible ? "Impossible" : `Need ${minimumScore.toFixed(0)}%`}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}


