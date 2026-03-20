"use client";

import { useEffect, useState } from "react";
import type { Assignment } from "@/types";
import { getAssignments } from "@/lib/firebase/firestore";

export default function useAssignments(syllabusId: string | undefined, userId: string | undefined) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!syllabusId || !userId) {
      setAssignments([]);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = getAssignments(
      syllabusId,
      (data) => {
        // TODO: Sort by dueDate ascending once dueDate is consistently a Date.
        setAssignments(data);
      },
      () => setError("Failed to load assignments")
    );

    setLoading(false);
    return () => unsub();
  }, [syllabusId, userId]);

  return { assignments, loading, error };
}

