import type { Assignment, Grade } from "@/types";

export type LetterGrade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-"
  | "D+"
  | "D"
  | "D-"
  | "F";

// Returns the current weighted percentage (0-100).
export function calculateWeightedGrade(assignments: Assignment[], grades: Grade[]): number {
  // TODO: implement weighted average using assignment.gradeWeight and logged scores.
  return 0;
}

// Returns projected weighted percentage given hypothetical scores for ungraded assignments.
export function calculateProjectedGrade(
  assignments: Assignment[],
  grades: Grade[],
  hypotheticals: Record<string, number> // assignmentId -> percentage score (0-100)
): number {
  // TODO: merge earned grade scores with hypothetical scores and compute final weighted result.
  return 0;
}

// Returns, for each remaining assignment, the minimum earned percentage needed
// to reach a target grade (or empty list if impossible).
export function calculateMinimumNeeded(
  assignments: Assignment[],
  grades: Grade[],
  targetGrade: LetterGrade
): Array<{ assignmentId: string; minimumScore: number }> {
  // TODO: compute minimum scores required per remaining assignment for target grade.
  return [];
}

export function percentageToLetterGrade(percentage: number): LetterGrade {
  // TODO: implement mapping rules.
  return "F";
}

export function letterGradeToMinPercentage(letter: LetterGrade): number {
  // TODO: implement mapping rules.
  return 0;
}

