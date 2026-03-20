"use client";

import { useEffect, useState } from "react";
import type { Syllabus } from "@/types";
import { getSyllabi } from "@/lib/firebase/firestore";

export default function useSyllabi(userId: string | undefined) {
  const [syllabi, setSyllabi] = useState<Syllabus[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setSyllabi([]);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = getSyllabi(
      userId,
      (data) => setSyllabi(data),
      () => setError("Failed to load syllabi")
    );

    setLoading(false);
    return () => unsub();
  }, [userId]);

  return { syllabi, loading, error };
}

