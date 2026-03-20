"use client";

import React, { useCallback } from "react";
import { useRouter } from "next/navigation";
import Navbar from "@/components/layout/Navbar";
import UploadZone from "@/components/syllabus/UploadZone";
import SyllabusCourseCard from "@/components/syllabus/SyllabusCourseCard";
import useAuth from "@/hooks/useAuth";
import useSyllabi from "@/hooks/useSyllabi";
import type { Syllabus } from "@/types";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const userId = user?.userId;
  const { syllabi, loading: syllabiLoading } = useSyllabi(userId);

  const onUpload = useCallback(async (file: File) => {
    // TODO: Implement POST /api/upload-syllabus with real Firebase ID token.
    const formData = new FormData();
    formData.append("file", file);

    await fetch("/api/upload-syllabus", { method: "POST", body: formData });
    // TODO: Ideally refresh/redirect after upload.
  }, []);

  const onDeleteSyllabus = useCallback(async (syllabusId: string) => {
    // TODO: Implement delete endpoint + idempotent Firestore/Pinecone cleanup.
    void syllabusId;
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-blue/40 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!userId) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={user?.email} userEmail={user?.phone} onSignOut={() => void signOut()} />
      <main className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-neutral-100">Dashboard</h1>
        <p className="mt-2 text-sm text-neutral-400">Upload syllabi and manage deadlines.</p>

        <div className="mt-7">
          <UploadZone onUpload={onUpload} />
        </div>

        <div className="mt-8">
          {syllabiLoading ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6 text-neutral-400">Loading syllabi...</div>
          ) : null}

          {syllabi.length === 0 ? (
            <div className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-10 text-center">
              <div className="text-neutral-300 font-bold">Upload your first syllabus to get started</div>
              <div className="mt-2 text-sm text-neutral-500">Syllabify will extract assignments and deadlines automatically.</div>
            </div>
          ) : null}

          {syllabi
            .slice()
            .sort((a, b) => (a.status === "processing" ? -1 : 0) - (b.status === "processing" ? -1 : 0))
            .map((s: Syllabus) => (
              <div key={s.syllabusId} className="mt-4">
                <SyllabusCourseCard syllabus={s} onDelete={onDeleteSyllabus} />
              </div>
            ))}

          {syllabi.some((s) => s.status === "processing") ? (
            <div className="mt-4 rounded-2xl border border-primary-blue/40 bg-primary-blue/10 p-4 text-primary-blue font-semibold">
              Processing your uploaded syllabus. This can take a few minutes.
            </div>
          ) : null}
        </div>
      </main>
    </div>
  );
}

