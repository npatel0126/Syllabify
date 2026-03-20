"use client";

import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import type { Syllabus } from "@/types";

export default function SyllabusCourseCard({
  syllabus,
  onDelete
}: Readonly<{
  syllabus: Syllabus;
  onDelete?: (syllabusId: string) => void;
}>) {
  const statusClasses =
    syllabus.status === "ready"
      ? "bg-green-500/15 text-green-200 border-green-400/40"
      : syllabus.status === "error"
        ? "bg-red-500/15 text-red-200 border-red-400/40"
        : "bg-primary-blue/15 text-primary-blue border-primary-blue/40";

  return (
    <div className="group rounded-2xl border border-neutral-800 bg-neutral-900/30 p-5 hover:border-neutral-700 transition relative">
      <Link href={`/course/${syllabus.syllabusId}`}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-lg font-bold text-neutral-100">{syllabus.courseName}</div>
            <div className="text-sm text-neutral-400">{syllabus.professor}</div>
            <div className="text-sm text-neutral-400">{syllabus.semester}</div>
          </div>
          <div
            className={[
              "rounded-full border px-3 py-1 text-xs font-semibold",
              statusClasses,
              syllabus.status === "processing" ? "animate-pulse" : ""
            ].join(" ")}
          >
            {syllabus.status === "processing" ? "Processing..." : syllabus.status === "ready" ? "Ready" : syllabus.status === "error" ? "Error" : "Processing"}
          </div>
        </div>
      </Link>

      {onDelete ? (
        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onDelete(syllabus.syllabusId)}
            className="text-red-400 hover:text-red-200"
          >
            Delete
          </Button>
        </div>
      ) : null}
    </div>
  );
}

