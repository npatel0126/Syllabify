"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { signInWithGoogle } from "@/lib/firebase/auth";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

// /signup → same Google OAuth flow as /login.
// Auto-triggers the Google popup immediately so landing page CTAs feel instant.
export default function SignupPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();

  useEffect(() => {
    if (!loading && user) {
      router.replace("/dashboard");
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (!loading && !user) {
      signInWithGoogle()
        .then(() => router.replace("/dashboard"))
        .catch(() => router.replace("/login"));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="h-8 w-8 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin" />
    </main>
  );
}
