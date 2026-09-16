"use client";

import React, { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import type { ReminderStyle } from "@/types";

// ─── Step dot indicator ───────────────────────────────────────────────────────

function StepDots({ step, total }: { step: number; total: number }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-8">
      {Array.from({ length: total }, (_, i) => {
        const active = i + 1 === step;
        return (
          <div
            key={i}
            className={[
              "h-2 rounded-full transition-all duration-300",
              active ? "w-6 bg-[#4ADE80]" : "w-2 bg-neutral-700",
            ].join(" ")}
          />
        );
      })}
    </div>
  );
}

// ─── Step 1 – Welcome ─────────────────────────────────────────────────────────

function StepWelcome({ name, onNext }: { name: string; onNext: () => void }) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Step 1 of 2
        </p>
        <h1 className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
          Welcome, <span className="text-[#4ADE80]">{name || "Student"}</span> 👋
        </h1>
        <p className="mt-3 text-sm leading-relaxed text-neutral-500 dark:text-neutral-400">
          Syllabify reads your syllabus, extracts every assignment and deadline,
          then helps you chat with it and track your grades — all in one place.
          <br /><br />
          Let&rsquo;s take 60 seconds to finish setting up your account.
        </p>
      </div>
      <ul className="mt-1 space-y-2">
        {[
          { icon: "📄", text: "Upload any course syllabus as a PDF" },
          { icon: "🤖", text: "AI extracts deadlines, grades & professor info" },
          { icon: "📱", text: "Optionally get SMS deadline reminders" },
        ].map(({ icon, text }) => (
          <li key={text} className="flex items-start gap-3 text-sm text-neutral-600 dark:text-neutral-400">
            <span className="text-base leading-5">{icon}</span>
            <span>{text}</span>
          </li>
        ))}
      </ul>
      <button
        type="button"
        onClick={onNext}
        className="mt-4 w-full rounded-xl bg-[#4ADE80] px-4 py-3 font-bold text-neutral-900 transition hover:brightness-110 active:scale-[0.98]"
      >
        Get started →
      </button>
    </section>
  );
}

// ─── Step 2 – Reminders ───────────────────────────────────────────────────────

const REMINDER_OPTIONS: { key: ReminderStyle; title: string; detail: string; recommended?: boolean }[] = [
  { key: "aggressive", title: "Aggressive", detail: "Reminders at 7 days, 2 days, and morning of" },
  { key: "moderate",   title: "Moderate",   detail: "Reminders at 3 days and morning of", recommended: true },
  { key: "light",      title: "Light",      detail: "One reminder 24 hours before" },
];

function StepReminders({
  user,
  onDone,
}: {
  user: { uid: string; email: string | null; displayName: string | null };
  onDone: () => void;
}) {
  const [reminderStyle, setReminderStyle] = useState<ReminderStyle>("moderate");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const finish = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email ?? "",
          displayName: user.displayName ?? "",
          reminderStyle,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          createdAt: serverTimestamp(),
        },
        { merge: true }
      );
      onDone();
    } catch (e) {
      console.error(e);
      setError("Could not save preferences. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [user, reminderStyle, onDone]);

  return (
    <section className="flex flex-col gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
          Step 2 of 2
        </p>
        <h2 className="mt-2 text-2xl font-extrabold text-neutral-900 dark:text-neutral-100">
          Reminder style
        </h2>
        <p className="mt-2 text-sm text-neutral-500 dark:text-neutral-400">
          How often should Syllabify remind you before deadlines?
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-700/60 bg-red-950/30 px-3 py-2 text-xs text-red-400">
          {error}
        </p>
      )}

      <div className="grid grid-cols-1 gap-3">
        {REMINDER_OPTIONS.map((opt) => {
          const selected = opt.key === reminderStyle;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => setReminderStyle(opt.key)}
              className={[
                "relative text-left rounded-2xl border px-5 py-4 transition-all duration-150",
                selected
                  ? "border-[#4ADE80] bg-[#4ADE80]/10 ring-1 ring-[#4ADE80]/30"
                  : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/20 hover:border-neutral-400 dark:hover:border-neutral-600",
              ].join(" ")}
            >
              {opt.recommended && (
                <span className="absolute top-3 right-3 rounded-full bg-[#4ADE80]/20 border border-[#4ADE80]/40 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-[#4ADE80]">
                  Recommended
                </span>
              )}
              <p className="font-bold text-sm text-neutral-900 dark:text-neutral-100 pr-20">{opt.title}</p>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">{opt.detail}</p>
            </button>
          );
        })}
      </div>

      <button
        type="button"
        disabled={saving}
        onClick={finish}
        className="mt-2 w-full rounded-xl bg-[#4ADE80] px-4 py-3 font-bold text-neutral-900 transition hover:brightness-110 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {saving ? "Saving…" : "Go to Dashboard →"}
      </button>
    </section>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function OnboardingPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const [step, setStep] = useState(1);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-6 w-6 rounded-full border-2 border-[#4ADE80] border-t-transparent animate-spin" />
      </main>
    );
  }

  const displayName = user?.displayName ?? user?.email?.split("@")[0] ?? "Student";

  return (
    <main className="min-h-screen flex items-center justify-center bg-neutral-50 dark:bg-[#0A0A0A] px-4 py-10 transition-colors">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-6">
          <span className="text-2xl font-extrabold tracking-tight text-[#4ADE80]">
            Syllabify
          </span>
        </div>

        {/* Animated step pill dots */}
        <StepDots step={step} total={2} />

        {/* Card */}
        <div className="rounded-2xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900/50 p-7 shadow-xl shadow-neutral-200/40 dark:shadow-black/40">
          {step === 1 && (
            <StepWelcome name={displayName} onNext={() => setStep(2)} />
          )}
          {step === 2 && user && (
            <StepReminders
              user={{ uid: user.uid, email: user.email, displayName: user.displayName }}
              onDone={() => router.replace("/dashboard")}
            />
          )}
        </div>

        <p className="mt-5 text-center text-xs text-neutral-400 dark:text-neutral-600">
          You can change all of these settings later in{" "}
          <span className="text-neutral-500 dark:text-neutral-500">Settings</span>.
        </p>
      </div>
    </main>
  );
}

