"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

export default function LoginPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [user, loading, router]);

  async function handleSignIn() {
    setError(null);
    setSubmitting(true);
    try {
      await signInWithGoogle();
      router.replace("/dashboard");
    } catch (err) {
      setError("Sign in failed. Please try again.");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-6 w-6 rounded-full border-2 border-[#4ADE80] border-t-transparent animate-spin" />
      </main>
    );
  }

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A] px-4">
      <div className="w-full max-w-sm rounded-xl border border-[#1F1F1F] bg-[#111111] p-8 shadow-2xl">
        {/* Wordmark */}
        <h1 className="text-3xl font-extrabold text-[#4ADE80] tracking-tight">
          Syllabify
        </h1>

        {/* Tagline */}
        <p className="mt-2 text-sm text-[#9CA3AF]">
          Upload your syllabus. Never miss a deadline.
        </p>

        {/* Error */}
        {error && (
          <p className="mt-4 rounded-lg border border-red-800 bg-red-950 px-3 py-2 text-xs text-red-400">
            {error}
          </p>
        )}

        {/* Sign-in button */}
        <button
          type="button"
          onClick={handleSignIn}
          disabled={submitting}
          className="mt-8 w-full flex items-center justify-center gap-3 rounded-lg border border-[#4ADE80]/40 bg-[#052e16] px-4 py-3 text-sm font-semibold text-[#4ADE80] transition hover:bg-[#4ADE80]/10 hover:border-[#4ADE80]/70 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {!submitting && (
            <svg className="h-5 w-5 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4ADE80"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#16A34A"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
                fill="#4ADE80"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#16A34A"
              />
            </svg>
          )}
          {submitting ? (
            <span className="flex items-center gap-2">
              <span className="h-4 w-4 rounded-full border-2 border-[#4ADE80] border-t-transparent animate-spin" />
              Signing in…
            </span>
          ) : (
            "Continue with Google"
          )}
        </button>

        <p className="mt-6 text-center text-xs text-[#4B5563]">
          By continuing, you agree to our terms of service.
        </p>
      </div>
    </main>
  );
}

