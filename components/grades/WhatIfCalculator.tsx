"use client";

import React, { useMemo, useState } from "react";
import type { Assignment, TargetGrade } from "@/types";

export default function WhatIfCalculator({
  assignments,
  targetGrade
}: Readonly<{
  assignments: Assignment[];
  targetGrade: TargetGrade;
}>) {
  // Hypotheticals are hypothetical percentage scores (0-100) per assignment.
  const [hypotheticals, setHypotheticals] = useState<Record<string, number>>({});

  const ungraded = useMemo(() => assignments, [assignments]);

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className="text-neutral-100 font-bold">What-if calculator</div>
          <div className="text-sm text-neutral-400">Adjust hypothetical scores for remaining assignments.</div>
        </div>
        <div className="text-sm font-semibold text-neutral-100 rounded-full border border-neutral-700 bg-neutral-900/40 px-3 py-1">
          Target: {targetGrade}
        </div>
      </div>

      <div className="mt-5 space-y-4">
        {ungraded.length === 0 ? (
          <div className="text-sm text-neutral-500">No remaining assignments.</div>
        ) : null}

        {ungraded.map((a) => {
          const value = typeof hypotheticals[a.assignmentId] === "number" ? hypotheticals[a.assignmentId] : 0;
          return (
            <div key={a.assignmentId} className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="font-semibold text-neutral-100 truncate">{a.title}</div>
                  <div className="text-xs text-neutral-400">{a.gradeWeight}% weight</div>
                </div>
                <div className="text-sm font-semibold text-neutral-100">{value.toFixed(0)}%</div>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                step={1}
                value={value}
                onChange={(e) => {
                  const next = Number(e.target.value);
                  setHypotheticals((prev) => ({ ...prev, [a.assignmentId]: next }));
                }}
                className="w-full mt-3 accent-accent-green"
              />
              <div className="mt-2 text-xs text-neutral-500">
                TODO: compute projected grade + at-risk status using `lib/grades/calculator.ts`.
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

