import type { Assignment, Grade, TargetGrade } from "@/types";

export function calculateWeightedGrade(assignments: Assignment[], grades: Grade[]): number {
  // TODO: Implement weighted grade calculation.
  // Scaffolding default.
  void assignments;
  void grades;
  return 0;
}

export function calculateProjectedGrade(
  assignments: Assignment[],
  grades: Grade[],
  hypotheticals: Record<string, number>
): number {
  // TODO: Implement what-if projected grade.
  void assignments;
  void grades;
  void hypotheticals;
  return 0;
}

export function calculateMinimumNeeded(
  assignments: Assignment[],
  grades: Grade[],
  targetGrade: TargetGrade
): Array<{ assignmentId: string; minimumScore: number }> {
  // TODO: Implement minimum scores required to hit target grade.
  void assignments;
  void grades;
  void targetGrade;
  return [];
}

export function percentageToLetterGrade(percentage: number): string {
  // TODO: Implement letter grade mapping.
  void percentage;
  return "B";
}

export function letterGradeToMinPercentage(letter: TargetGrade): number {
  // TODO: Implement min percentage thresholds for each target grade.
  switch (letter) {
    case "A+":
      return 97;
    case "A":
      return 93;
    case "A-":
      return 90;
    case "B+":
      return 87;
    case "B":
      return 83;
    case "B-":
      return 80;
    case "C+":
      return 77;
    case "C":
      return 73;
    case "C-":
      return 70;
    default:
      return 70;
  }
}

