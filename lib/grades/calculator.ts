import type { Assignment, Grade, TargetGrade } from "@/types";

/** Weighted average of graded assignments (0-100). Only assignments that have a
 *  corresponding Grade record and a non-zero gradeWeight are included. */
export function calculateWeightedGrade(assignments: Assignment[], grades: Grade[]): number {
  const gradeMap = new Map(grades.map((g) => [g.assignmentId, g]));
  let weightedSum = 0;
  let totalWeight = 0;

  for (const a of assignments) {
    const g = gradeMap.get(a.assignmentId);
    if (!g || !a.gradeWeight) continue;
    const pct = g.scoreMax > 0 ? (g.scoreEarned / g.scoreMax) * 100 : 0;
    weightedSum += pct * a.gradeWeight;
    totalWeight += a.gradeWeight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/** What-if projected grade. hypotheticals maps assignmentId → percentage (0-100)
 *  for assignments that haven't been graded yet. */
export function calculateProjectedGrade(
  assignments: Assignment[],
  grades: Grade[],
  hypotheticals: Record<string, number>
): number {
  const gradeMap = new Map(grades.map((g) => [g.assignmentId, g]));
  let weightedSum = 0;
  let totalWeight = 0;

  for (const a of assignments) {
    if (!a.gradeWeight) continue;
    const g = gradeMap.get(a.assignmentId);
    let pct: number | undefined;
    if (g) {
      pct = g.scoreMax > 0 ? (g.scoreEarned / g.scoreMax) * 100 : 0;
    } else if (hypotheticals[a.assignmentId] !== undefined) {
      pct = hypotheticals[a.assignmentId];
    }
    if (pct === undefined) continue;
    weightedSum += pct * a.gradeWeight;
    totalWeight += a.gradeWeight;
  }

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/** For each ungraded assignment, compute the minimum score % needed to reach targetGrade. */
export function calculateMinimumNeeded(
  assignments: Assignment[],
  grades: Grade[],
  targetGrade: TargetGrade
): Array<{ assignmentId: string; minimumScore: number }> {
  const target = letterGradeToMinPercentage(targetGrade);
  const gradeMap = new Map(grades.map((g) => [g.assignmentId, g]));

  let earnedWeightedSum = 0;
  let gradedWeight = 0;
  let ungradedWeight = 0;

  for (const a of assignments) {
    if (!a.gradeWeight) continue;
    const g = gradeMap.get(a.assignmentId);
    if (g) {
      earnedWeightedSum += (g.scoreMax > 0 ? (g.scoreEarned / g.scoreMax) * 100 : 0) * a.gradeWeight;
      gradedWeight += a.gradeWeight;
    } else {
      ungradedWeight += a.gradeWeight;
    }
  }

  if (ungradedWeight === 0) return [];

  const totalWeight = gradedWeight + ungradedWeight;
  // target * totalWeight = earnedWeightedSum + requiredSum
  const requiredSum = target * totalWeight - earnedWeightedSum;
  const requiredAvg = requiredSum / ungradedWeight;

  return assignments
    .filter((a) => a.gradeWeight && !gradeMap.has(a.assignmentId))
    .map((a) => ({
      assignmentId: a.assignmentId,
      // Do NOT clamp to 100 — values > 100 signal "impossible" to the UI.
      minimumScore: Math.max(0, requiredAvg),
    }));
}

export function percentageToLetterGrade(percentage: number): string {
  if (percentage >= 97) return "A+";
  if (percentage >= 93) return "A";
  if (percentage >= 90) return "A-";
  if (percentage >= 87) return "B+";
  if (percentage >= 83) return "B";
  if (percentage >= 80) return "B-";
  if (percentage >= 77) return "C+";
  if (percentage >= 73) return "C";
  if (percentage >= 70) return "C-";
  if (percentage >= 67) return "D+";
  if (percentage >= 63) return "D";
  if (percentage >= 60) return "D-";
  return "F";
}

export function letterGradeToMinPercentage(letter: TargetGrade): number {
  switch (letter) {
    case "A+": return 97;
    case "A":  return 93;
    case "A-": return 90;
    case "B+": return 87;
    case "B":  return 83;
    case "B-": return 80;
    case "C+": return 77;
    case "C":  return 73;
    case "C-": return 70;
    default:   return 70;
  }
}

