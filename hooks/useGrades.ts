"use client";

import { useEffect, useMemo, useState } from "react";
import type { Assignment, Grade, TargetGrade } from "@/types";
import { getGrades } from "@/lib/firebase/firestore";
import {
  calculateProjectedGrade,
  calculateWeightedGrade,
  percentageToLetterGrade
} from "@/lib/grades/calculator";

export default function useGrades(syllabusId: string | undefined, userId: string | undefined) {
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // NOTE: This hook depends on assignments for the calculator; pages may compute
  // projected grade and what-if in component state. For scaffolding, keep it simple.
  const [assignmentsSeed, setAssignmentsSeed] = useState<Assignment[]>([]);

  useEffect(() => {
    if (!syllabusId || !userId) {
      setGrades([]);
      return;
    }

    setLoading(true);
    setError(null);

    const unsub = getGrades(
      syllabusId,
      userId,
      (data) => {
        setGrades(data);
        setLoading(false);
      },
      (err) => {
        console.error("[useGrades] onSnapshot error:", err);
        setError("Failed to load grades");
        setLoading(false);
      }
    );

    return () => unsub();
  }, [syllabusId, userId]);

  const currentGrade = useMemo(() => {
    return calculateWeightedGrade(assignmentsSeed, grades);
  }, [assignmentsSeed, grades]);

  const letterGrade = useMemo(() => {
    return percentageToLetterGrade(currentGrade);
  }, [currentGrade]);

  // Placeholder values for scaffolding.
  return {
    grades,
    currentGrade,
    letterGrade,
    loading,
    error,
    setAssignmentsSeed,
    calculateProjectedGrade: (hypotheticals: Record<string, number>) =>
      calculateProjectedGrade(assignmentsSeed, grades, hypotheticals)
  };
}

