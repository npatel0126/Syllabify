"use client";

import { useEffect, useState } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Assignment } from "@/types";

/**
 * Fetches ALL assignments belonging to a user across all their courses.
 * Used by the dashboard calendar view.
 */
export default function useAllAssignments(userId: string | undefined) {
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!userId) { setAssignments([]); return; }
    setLoading(true);
    const q = query(collection(db, "assignments"), where("userId", "==", userId));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAssignments(snap.docs.map(d => ({ assignmentId: d.id, ...d.data() } as Assignment)));
        setLoading(false);
      },
      () => setLoading(false),
    );
    return () => unsub();
  }, [userId]);

  return { assignments, loading };
}
