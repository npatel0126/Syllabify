"use client";

import React from "react";
import type { TargetGrade } from "@/types";

export default function GradeSummaryCard({
  currentGrade,
  letterGrade,
  progressLabel
}: Readonly<{
  currentGrade: number;
  letterGrade: TargetGrade | string;
  progressLabel?: string;
}>) {
  const pct = Math.max(0, Math.min(100, currentGrade));

  return (
    <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
      <div className="text-sm text-neutral-400 font-semibold">Current Weighted Grade</div>
      <div className="mt-2 flex items-end gap-4">
        <div className="text-5xl font-extrabold text-neutral-100">{pct.toFixed(1)}%</div>
        <div className="pb-1">
          <div className="text-sm text-neutral-400">Letter</div>
          <div className="text-3xl font-extrabold text-green-300">{letterGrade}</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="h-3 rounded-full bg-neutral-800 overflow-hidden border border-neutral-700">
          <div className="h-full bg-accent-green w-0" style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs text-neutral-500">{progressLabel ?? `${Math.max(0, 100 - pct)}% to 100%`}</div>
      </div>
    </div>
  );
}

