"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading } = useFirebaseAuth();

  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [loading, user, router]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <div className="h-8 w-8 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin" />
      </main>
    );
  }

  if (!user) return null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
      <h1 className="text-2xl font-bold text-[#4ADE80]">Dashboard</h1>
    </main>
  );
}
