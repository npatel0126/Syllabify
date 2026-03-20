"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import useAssignments from "@/hooks/useAssignments";
import CourseTabs from "@/components/layout/CourseTabs";
import AssignmentRow from "@/components/syllabus/AssignmentRow";
import type { Assignment, Syllabus } from "@/types";
import { getSyllabusById, updateAssignment } from "@/lib/firebase/firestore";
import { formatDueDate } from "@/lib/utils/dates";

export default function CourseOverviewPage() {
  const router = useRouter();
  const params = useParams<{ syllabusId: string }>();
  const syllabusId = params?.syllabusId;

  const { user, loading } = useAuth();
  const userId = user?.userId;

  const { assignments, loading: assignmentsLoading } = useAssignments(syllabusId, userId);
  const [syllabus, setSyllabus] = useState<Syllabus | null>(null);

  useEffect(() => {
    if (!syllabusId) return;
    void getSyllabusById(syllabusId).then(setSyllabus);
  }, [syllabusId]);

  const orderedAssignments = useMemo(() => {
    // TODO: enforce dueDate ordering when dueDate is consistent.
    return assignments;
  }, [assignments]);

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

  const status = syllabus?.status ?? "processing";

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-start justify-between gap-6">
          <div>
            <div className="text-3xl font-extrabold text-neutral-100">{syllabus?.courseName ?? "Course"}</div>
            <div className="mt-1 text-neutral-400">{syllabus?.professor ?? ""}</div>
            <div className="mt-1 text-neutral-400">{syllabus?.semester ?? ""}</div>
            <div className="mt-2 text-xs font-semibold inline-flex items-center gap-2 rounded-full border border-neutral-800 bg-neutral-900/30 px-3 py-1">
              <span
                className={[
                  "h-2 w-2 rounded-full",
                  status === "ready" ? "bg-green-400" : status === "error" ? "bg-red-400" : "bg-primary-blue"
                ].join(" ")}
              />
              {status === "ready" ? "Ready" : status === "error" ? "Error" : "Processing"}
            </div>
          </div>
        </div>

        <CourseTabs syllabusId={syllabusId} active="overview" />

        <section className="mt-6">
          <h2 className="text-xl font-bold text-neutral-100">Assignments</h2>
          {assignmentsLoading ? (
            <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 text-neutral-400">
              Loading assignments...
            </div>
          ) : null}

          <div className="mt-4 rounded-2xl border border-neutral-800 bg-neutral-900/20 overflow-hidden">
            {orderedAssignments.map((a: Assignment) => (
              <AssignmentRow
                key={a.assignmentId}
                assignment={a}
                onConfirmDueDate={(assignmentId, dueDate) => {
                  // TODO: call a dedicated API route or helper with auth verification.
                  void updateAssignment(assignmentId, { dueDate, dueDateConfirmed: true });
                }}
              />
            ))}

            {orderedAssignments.length === 0 && !assignmentsLoading ? (
              <div className="p-6 text-neutral-500 text-sm">No assignments yet.</div>
            ) : null}
          </div>
        </section>

        {/* TODO: Add timeline heading / legend, and confirmed date details if needed. */}
        <div className="mt-8 text-xs text-neutral-500">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <span>Reminder due dates formatted like: </span>
          <span className="font-semibold">{formatDueDate(new Date())}</span>
        </div>
      </main>
    </div>
  );
}

