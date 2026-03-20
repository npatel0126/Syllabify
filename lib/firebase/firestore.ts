import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Assignment, Grade, Syllabus, User } from "@/types";

export function getUserDoc(userId: string): Promise<User | null> {
  // TODO: Implement typed user document reads.
  // Scaffolding return null to keep the app runnable.
  return Promise.resolve(null);
}

export function updateUserDoc(userId: string, data: Partial<User>): Promise<void> {
  // TODO: Implement update via Firestore updateDoc.
  return Promise.resolve();
}

export function getSyllabi(userId: string, onData: (syllabi: Syllabus[]) => void, onError?: (e: unknown) => void) {
  // TODO: Implement real-time listener for syllabi.
  // Return an unsubscribe function placeholder.
  const noop = () => undefined;
  void userId;
  void onData;
  void onError;
  return noop;
}

export function getSyllabusById(syllabusId: string): Promise<Syllabus | null> {
  // TODO: Implement single doc fetch.
  return Promise.resolve(null);
}

export function getAssignments(
  syllabusId: string,
  onData: (assignments: Assignment[]) => void,
  onError?: (e: unknown) => void
) {
  // TODO: Implement real-time listener with ordering by dueDate.
  const noop = () => undefined;
  void syllabusId;
  void onData;
  void onError;
  return noop;
}

export function updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
  // TODO: Implement update.
  return Promise.resolve();
}

export function getGrades(
  syllabusId: string,
  userId: string,
  onData: (grades: Grade[]) => void,
  onError?: (e: unknown) => void
) {
  // TODO: Implement real-time listener for grades.
  const noop = () => undefined;
  void syllabusId;
  void userId;
  void onData;
  void onError;
  return noop;
}

export function upsertGrade(gradeData: Partial<Grade> & { assignmentId: string; userId: string; syllabusId: string }) {
  // TODO: Implement create/update grade document.
  return Promise.resolve();
}

// NOTE: Imported-but-unused Firebase SDK symbols above are intentionally left
// here as scaffolding hints for what will be implemented next.
export const _firestoreScaffold = {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc
};

