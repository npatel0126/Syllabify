"use client";

import React, { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import Navbar from "@/components/layout/Navbar";
import Modal from "@/components/ui/Modal";
import type { ReminderStyle } from "@/types";
import Button from "@/components/ui/Button";

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading, signOut } = useAuth();

  const [reminderStyle, setReminderStyle] = useState<ReminderStyle>("moderate");
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [savingStyle, setSavingStyle] = useState(false);

  const name = useMemo(() => user?.email?.split("@")[0] ?? "Student", [user?.email]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-blue/40 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.userId) {
    router.replace("/login");
    return null;
  }

  return (
    <div className="min-h-screen">
      <Navbar userName={name} userEmail={user.email} onSignOut={() => void signOut()} />

      <main className="max-w-5xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-extrabold text-neutral-100">Settings</h1>
        <div className="mt-2 text-sm text-neutral-400">Manage your account and reminder preferences.</div>

        <div className="mt-6 space-y-6">
          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="font-bold text-neutral-100">Profile</div>
            <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <div className="text-xs text-neutral-500 font-semibold mb-1">Name</div>
                <div className="text-neutral-200">{name}</div>
              </div>
              <div>
                <div className="text-xs text-neutral-500 font-semibold mb-1">Email</div>
                <div className="text-neutral-200">{user.email}</div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="font-bold text-neutral-100">Notifications</div>
            <div className="mt-2 text-sm text-neutral-400">Choose how aggressively we remind you.</div>

            <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              {[
                { key: "aggressive" as const, title: "Aggressive", detail: "7 days, 2 days, morning of" },
                { key: "moderate" as const, title: "Moderate", detail: "3 days, morning of" },
                { key: "light" as const, title: "Light", detail: "24 hours" }
              ].map((opt) => {
                const selected = opt.key === reminderStyle;
                return (
                  <button
                    key={opt.key}
                    type="button"
                    onClick={() => setReminderStyle(opt.key)}
                    className={[
                      "rounded-2xl border p-4 text-left transition",
                      selected ? "border-primary-blue bg-primary-blue/10" : "border-neutral-800 bg-neutral-900/20"
                    ].join(" ")}
                  >
                    <div className="font-bold text-neutral-100">{opt.title}</div>
                    <div className="text-sm text-neutral-400 mt-1">{opt.detail}</div>
                  </button>
                );
              })}
            </div>

            <div className="mt-5 flex items-center justify-end">
              <Button
                variant="primary"
                size="md"
                isLoading={savingStyle}
                onClick={async () => {
                  setSavingStyle(true);
                  try {
                    // TODO: persist reminder style to Firestore `users/{userId}`.
                    await Promise.resolve();
                  } finally {
                    setSavingStyle(false);
                  }
                }}
              >
                Save preferences
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="font-bold text-neutral-100">Phone number</div>
            <div className="mt-2 text-sm text-neutral-400">Verified phone number controls SMS reminders.</div>
            <div className="mt-4 flex items-center justify-between gap-4">
              <div className="text-neutral-200 font-semibold">{user.phone || "Not verified"}</div>
              <Button
                variant="secondary"
                size="sm"
                onClick={async () => {
                  // TODO: re-trigger OTP flow and update Firestore user doc.
                  router.push("/onboarding");
                }}
              >
                Change
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-red-500/30 bg-red-500/5 p-6">
            <div className="font-bold text-red-200">Danger zone</div>
            <div className="mt-2 text-sm text-red-100/80">
              Delete your account and purge your data from Firestore, Storage, Pinecone, and scheduled reminders.
            </div>
            <div className="mt-5">
              <Button variant="danger" size="md" onClick={() => setDeleteOpen(true)}>
                Delete my account
              </Button>
            </div>
          </section>

          <section className="rounded-2xl border border-neutral-800 bg-neutral-900/30 p-6">
            <div className="font-bold text-neutral-100">Google Calendar</div>
            <div className="mt-2 text-sm text-neutral-400">
              Connect to automatically create calendar events for each assignment deadline.
            </div>
            <div className="mt-4 flex items-center justify-between">
              <div className="text-neutral-200 font-semibold">Status: not connected (scaffolding)</div>
              <Button variant="secondary" size="sm" onClick={() => router.push("/api/google-calendar/auth")}>
                Reconnect
              </Button>
            </div>
          </section>
        </div>
      </main>

      <Modal
        isOpen={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirm account deletion"
      >
        <div className="text-sm text-neutral-300">
          This will purge your data and cannot be undone.
        </div>
        <div className="mt-5 flex items-center justify-end gap-3">
          <Button variant="secondary" size="sm" onClick={() => setDeleteOpen(false)}>
            Cancel
          </Button>
          <Button
            variant="danger"
            size="sm"
            isLoading={deleting}
            onClick={async () => {
              setDeleting(true);
              try {
                // TODO: call Cloud Function `delete_account`.
                await fetch("/api/delete-account", { method: "POST" });
                router.replace("/login");
              } finally {
                setDeleting(false);
                setDeleteOpen(false);
              }
            }}
          >
            Delete
          </Button>
        </div>
      </Modal>
    </div>
  );
}

