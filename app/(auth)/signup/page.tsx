"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function SignupPage() {
  const router = useRouter();
  useEffect(() => { router.replace("/login"); }, [router]);
  return (
    <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
      <div className="h-8 w-8 rounded-full border-2 border-[#4ADE80]/30 border-t-[#4ADE80] animate-spin" />
    </main>
  );
}
