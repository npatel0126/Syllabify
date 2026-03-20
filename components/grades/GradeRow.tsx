"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { Assignment, Grade, TargetGrade } from "@/types";

export default function GradeRow({
  assignment,
  initialEarned = 0,
  initialMax = 100,
  targetGrade,
  minScoreNeeded,
  onChange
}: Readonly<{
  assignment: Assignment;
  initialEarned?: number;
  initialMax?: number;
  targetGrade?: TargetGrade | string;
  minScoreNeeded?: number; // percentage 0-100
  onChange?: (payload: { scoreEarned: number; scoreMax: number }) => void;
}>) {
  const [scoreEarned, setScoreEarned] = useState(initialEarned);
  const [scoreMax, setScoreMax] = useState(initialMax);

  useEffect(() => {
    setScoreEarned(initialEarned);
  }, [initialEarned]);
  useEffect(() => {
    setScoreMax(initialMax);
  }, [initialMax]);

  const percentage = useMemo(() => {
    if (!scoreMax) return 0;
    return (scoreEarned / scoreMax) * 100;
  }, [scoreEarned, scoreMax]);

  const onLocalChange = (earned: number, max: number) => {
    setScoreEarned(earned);
    setScoreMax(max);
    onChange?.({ scoreEarned: earned, scoreMax: max });
  };

  const onTrack = typeof minScoreNeeded === "number" ? percentage >= minScoreNeeded : true;

  return (
    <div className="rounded-xl border border-neutral-800 bg-neutral-900/20 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="font-semibold text-neutral-100 truncate">{assignment.title}</div>
          <div className="text-xs text-neutral-400">{assignment.gradeWeight}% weight</div>
        </div>
        <div className={["text-xs font-semibold px-2 py-1 rounded-full border", onTrack ? "border-green-400/40 text-green-200 bg-green-500/10" : "border-red-400/40 text-red-200 bg-red-500/10"].join(" ")}>
          {percentage.toFixed(1)}%
        </div>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-3">
        <label className="block">
          <div className="text-xs text-neutral-400 mb-1">Earned</div>
          <input
            type="number"
            value={scoreEarned}
            onChange={(e) => onLocalChange(Number(e.target.value), scoreMax)}
            className="w-full rounded-md bg-neutral-800/40 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-primary-blue/25"
          />
        </label>
        <label className="block">
          <div className="text-xs text-neutral-400 mb-1">Max</div>
          <input
            type="number"
            value={scoreMax}
            onChange={(e) => onLocalChange(scoreEarned, Number(e.target.value))}
            className="w-full rounded-md bg-neutral-800/40 border border-neutral-700 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-primary-blue/25"
          />
        </label>
      </div>

      <div className="mt-3">
        <div className="h-2 rounded-full bg-neutral-800 border border-neutral-700 overflow-hidden">
          <div
            className={[
              "h-full rounded-full",
              onTrack ? "bg-green-500/70" : "bg-red-500/70"
            ].join(" ")}
            style={{ width: `${Math.max(0, Math.min(100, percentage))}%` }}
          />
        </div>
        {typeof minScoreNeeded === "number" ? (
          <div className="mt-2 text-xs text-neutral-500">
            Target: {minScoreNeeded.toFixed(0)}% ({onTrack ? "on track" : "below target"})
          </div>
        ) : null}
      </div>
    </div>
  );
}

