"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";

export default function HomePage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (loading) return;
    if (user) router.replace("/dashboard");
    else router.replace("/login");
  }, [loading, router, user]);

  return (
    <div className="min-h-screen grid place-items-center">
      <div className="w-10 h-10 border-2 border-primary-blue/40 border-t-primary-blue rounded-full animate-spin" />
    </div>
  );
}

