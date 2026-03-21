"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
    else router.replace("/login");
  }, [loading, user, router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="h-8 w-8 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin" />
    </main>
  );
}

