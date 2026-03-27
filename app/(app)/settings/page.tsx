"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import { signOut } from "@/lib/firebase/auth";
import { getUserDoc, updateUserDoc } from "@/lib/firebase/firestore";
import Button from "@/components/ui/Button";
import Spinner from "@/components/ui/Spinner";
import type { ReminderStyle, User } from "@/types";

const REMINDER_OPTIONS: { value: ReminderStyle; label: string; description: string }[] = [
  {
    value: "aggressive",
    label: "Aggressive",
    description: "Reminders at 2 weeks, 1 week, 3 days, and 1 day before due dates.",
  },
  {
    value: "moderate",
    label: "Moderate",
    description: "Reminders at 1 week and 1 day before due dates.",
  },
  {
    value: "light",
    label: "Light",
    description: "One reminder the day before each due date.",
  },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseAuth();

  const [userDoc, setUserDoc] = useState<User | null>(null);
  const [docLoading, setDocLoading] = useState(true);
  const [reminderStyle, setReminderStyle] = useState<ReminderStyle>("moderate");
  const [timezone, setTimezone] = useState(() =>
    Intl.DateTimeFormat().resolvedOptions().timeZone
  );
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    setDocLoading(true);
    getUserDoc(user.uid)
      .then((doc) => {
        setUserDoc(doc);
        if (doc?.reminderStyle) setReminderStyle(doc.reminderStyle);
        if (doc?.timezone) setTimezone(doc.timezone);
      })
      .finally(() => setDocLoading(false));
  }, [user]);

  const handleSave = useCallback(async () => {
    if (!user) return;
    setSaving(true);
    setSaved(false);
    try {
      await updateUserDoc(user.uid, { reminderStyle, timezone });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } finally {
      setSaving(false);
    }
  }, [user, reminderStyle, timezone]);

  const handleSignOut = useCallback(async () => {
    setSigningOut(true);
    await signOut();
    router.replace("/login");
  }, [router]);

  if (authLoading || docLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Spinner />
      </main>
    );
  }
  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] px-4 py-10">
      <div className="mx-auto max-w-2xl">
        {/* Back */}
        <button
          onClick={() => router.push("/dashboard")}
          className="mb-6 flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Dashboard
        </button>

        <h1 className="text-2xl font-bold text-neutral-100">Settings</h1>
        <p className="mt-1 text-sm text-neutral-400">Manage your account and notification preferences.</p>

        {/* ── Account ─────────────────────────────────────────────────── */}
        <section className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/20 divide-y divide-neutral-800">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-neutral-300">Account</h2>
          </div>
          <div className="px-5 py-4 flex items-center gap-4">
            {user.photoURL ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={user.photoURL}
                alt="Profile"
                className="h-12 w-12 rounded-full border border-neutral-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="h-12 w-12 rounded-full border border-neutral-700 bg-neutral-800 flex items-center justify-center text-lg font-bold text-neutral-300">
                {(user.displayName ?? user.email ?? "?")[0].toUpperCase()}
              </div>
            )}
            <div className="min-w-0">
              <div className="text-sm font-semibold text-neutral-100 truncate">
                {user.displayName ?? "Student"}
              </div>
              <div className="text-xs text-neutral-400 truncate">{user.email}</div>
              {userDoc?.phone && (
                <div className="text-xs text-neutral-500 mt-0.5">{userDoc.phone}</div>
              )}
            </div>
          </div>
        </section>

        {/* ── Reminder Style ───────────────────────────────────────────── */}
        <section className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900/20 divide-y divide-neutral-800">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-neutral-300">Reminder Style</h2>
            <p className="text-xs text-neutral-500 mt-0.5">
              How frequently you want to be nudged about upcoming deadlines.
            </p>
          </div>
          <div className="px-5 py-4 space-y-3">
            {REMINDER_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                className={[
                  "flex items-start gap-3 rounded-xl border p-4 cursor-pointer transition",
                  reminderStyle === opt.value
                    ? "border-[#7DD3FC]/40 bg-[#7DD3FC]/5"
                    : "border-neutral-800 hover:border-neutral-700",
                ].join(" ")}
              >
                <input
                  type="radio"
                  name="reminderStyle"
                  value={opt.value}
                  checked={reminderStyle === opt.value}
                  onChange={() => setReminderStyle(opt.value)}
                  className="mt-0.5 accent-[#7DD3FC]"
                />
                <div>
                  <div className="text-sm font-semibold text-neutral-100">{opt.label}</div>
                  <div className="text-xs text-neutral-400 mt-0.5">{opt.description}</div>
                </div>
              </label>
            ))}
          </div>
        </section>

        {/* ── Timezone ─────────────────────────────────────────────────── */}
        <section className="mt-5 rounded-2xl border border-neutral-800 bg-neutral-900/20 divide-y divide-neutral-800">
          <div className="px-5 py-4">
            <h2 className="text-sm font-semibold text-neutral-300">Timezone</h2>
          </div>
          <div className="px-5 py-4">
            <label className="block">
              <span className="text-xs text-neutral-400 mb-1 block">Your timezone</span>
              <input
                type="text"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                placeholder="e.g. America/New_York"
                className="w-full rounded-lg border border-neutral-700 bg-neutral-800/40 px-3 py-2 text-sm text-neutral-100 outline-none focus:ring-2 focus:ring-[#7DD3FC]/20"
              />
              <p className="mt-1.5 text-xs text-neutral-600">
                Detected: {Intl.DateTimeFormat().resolvedOptions().timeZone}
              </p>
            </label>
          </div>
        </section>

        {/* ── Save ─────────────────────────────────────────────────────── */}
        <div className="mt-6 flex items-center gap-3">
          <Button variant="primary" size="md" isLoading={saving} onClick={() => void handleSave()}>
            Save changes
          </Button>
          {saved && (
            <span className="text-sm text-[#4ADE80] font-semibold flex items-center gap-1">
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
              Saved
            </span>
          )}
        </div>

        {/* ── Danger zone ──────────────────────────────────────────────── */}
        <section className="mt-10 rounded-2xl border border-red-900/40 bg-red-950/10">
          <div className="px-5 py-4 border-b border-red-900/30">
            <h2 className="text-sm font-semibold text-red-300">Danger Zone</h2>
          </div>
          <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap">
            <div>
              <div className="text-sm font-semibold text-neutral-200">Sign out</div>
              <div className="text-xs text-neutral-500 mt-0.5">
                You will be returned to the login screen.
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              isLoading={signingOut}
              onClick={() => void handleSignOut()}
            >
              Sign out
            </Button>
          </div>
        </section>
      </div>
    </main>
  );
}
