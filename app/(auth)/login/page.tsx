"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading, signIn } = useAuth();
  const [submitting, setSubmitting] = useState(false);

  const email = user?.email ?? "";
  const title = useMemo(() => (email ? `Welcome, ${email}` : "Welcome to Syllabify"), [email]);

  useEffect(() => {
    if (loading) return;
    if (!user) return;

    // TODO: Replace with real check (phone verified? reminder settings saved?).
    router.replace("/dashboard");
  }, [loading, router, user]);

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-neutral-950">
      <div className="w-full max-w-md rounded-2xl border border-neutral-800 bg-neutral-900/40 p-7 shadow-xl">
        <div className="flex items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/syllabify-logo.svg" alt="Syllabify logo" className="h-10 w-auto" />
          <div className="font-extrabold text-primary-blue text-lg">Syllabify</div>
        </div>

        <h1 className="mt-4 text-2xl font-bold text-neutral-100">{title}</h1>
        <p className="mt-2 text-sm text-neutral-400">Upload your syllabus. Never miss a deadline.</p>

        <div className="mt-6">
          <button
            type="button"
            onClick={async () => {
              setSubmitting(true);
              try {
                await signIn();
                router.replace("/onboarding");
              } finally {
                setSubmitting(false);
              }
            }}
            disabled={submitting || loading}
            className="w-full rounded-xl bg-primary-blue px-4 py-3 font-semibold text-white hover:brightness-110 disabled:opacity-60 disabled:cursor-not-allowed transition"
          >
            {submitting ? "Signing in..." : "Continue with Google"}
          </button>
        </div>

        <div className="mt-4 text-xs text-neutral-500">
          Scaffolding: real OAuth and onboarding logic will be wired next.
        </div>
      </div>
    </main>
  );
}

