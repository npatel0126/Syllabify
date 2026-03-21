"use client";

import { useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import useSyllabi from "@/hooks/useSyllabi";
import UploadZone from "@/components/syllabus/UploadZone";
import SyllabusCourseCard from "@/components/syllabus/SyllabusCourseCard";
import { updateSyllabus } from "@/lib/firebase/firestore";

// Derive first name from Firebase displayName or email
function getFirstName(displayName: string | null, email: string | null): string {
  if (displayName) return displayName.split(" ")[0];
  if (email) return email.split("@")[0];
  return "there";
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const { syllabi } = useSyllabi(user?.uid);

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  // After client-side upload completes, update Firestore with the download URL
  const handleUploadComplete = useCallback(
    async (downloadUrl: string, syllabusId: string) => {
      await updateSyllabus(syllabusId, { pdfUrl: downloadUrl, status: "processing" });
    },
    []
  );

  const isProcessing = syllabi.some((s) => s.status === "processing");

  // ── Placeholder syllabusId — real flow: POST /api/upload-syllabus first ────
  // In the full flow the UploadZone would receive a syllabusId created by
  // the API route. For the dashboard we create it inline via a temp value;
  // the UploadZone only uses it to call onUploadComplete.
  const pendingSyllabusId = user ? `pending_${user.uid}` : "pending";

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  const firstName = getFirstName(user.displayName, user.email);

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto max-w-3xl">

        {/* ── Processing banner ─────────────────────────────────────────── */}
        {isProcessing && (
          <div className="mb-6 flex items-center gap-2 rounded-xl border border-[#4ADE80]/30 bg-[#052e16] px-4 py-3">
            <span className="h-2 w-2 rounded-full bg-[#4ADE80] animate-pulse" />
            <p className="text-sm text-[#4ADE80]">
              Processing your syllabus — this usually takes under a minute…
            </p>
          </div>
        )}

        {/* ── Greeting ──────────────────────────────────────────────────── */}
        <h1 className="text-2xl font-bold text-white">
          {getGreeting()}, {firstName}
        </h1>
        <p className="mt-1 text-sm text-[#9CA3AF]">Your courses</p>

        {/* ── Upload zone ───────────────────────────────────────────────── */}
        <div className="mt-6">
          <UploadZone
            syllabusId={pendingSyllabusId}
            onUploadComplete={handleUploadComplete}
          />
        </div>

        {/* ── Course grid ───────────────────────────────────────────────── */}
        {syllabi.length > 0 ? (
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {syllabi.map((syllabus) => (
              <SyllabusCourseCard key={syllabus.syllabusId} syllabus={syllabus} />
            ))}
          </div>
        ) : (
          <div className="mt-10 flex flex-col items-center gap-3 text-center">
            <div className="h-16 w-16 rounded-full border border-[#1F1F1F] bg-[#111111] flex items-center justify-center">
              <svg className="h-7 w-7 text-[#4B5563]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.042A8.967 8.967 0 0 0 6 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 0 1 6 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 0 1 6-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0 0 18 18a8.967 8.967 0 0 0-6 2.292m0-14.25v14.25" />
              </svg>
            </div>
            <p className="text-sm text-[#9CA3AF]">Upload your first syllabus to get started</p>
          </div>
        )}

      </div>
    </main>
  );
}
