import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  serverTimestamp,
  updateDoc,
  where,
  type Unsubscribe
} from "firebase/firestore";
import { db } from "./config";
import type { Assignment, Grade, Syllabus, User } from "@/types";

export function getUserDoc(userId: string): Promise<User | null> {
  // TODO: implement Firestore read.
  // This is intentionally stubbed for scaffolding.
  return Promise.resolve(null);
}

export function updateUserDoc(userId: string, data: Partial<User>): Promise<void> {
  // TODO: implement Firestore update.
  return Promise.resolve();
}

export function getSyllabi(
  userId: string,
  onUpdate: (syllabi: Syllabus[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  // TODO: implement real-time listener (onSnapshot).
  const noop: Unsubscribe = () => {};
  return noop;
}

export function getSyllabusById(syllabusId: string): Promise<Syllabus | null> {
  // TODO: implement Firestore read.
  return Promise.resolve(null);
}

export function getAssignments(
  syllabusId: string,
  onUpdate: (assignments: Assignment[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  // TODO: implement real-time listener (onSnapshot) sorted by dueDate ASC.
  const noop: Unsubscribe = () => {};
  return noop;
}

export function updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
  // TODO: implement Firestore update.
  return Promise.resolve();
}

export function getGrades(
  syllabusId: string,
  userId: string,
  onUpdate: (grades: Grade[]) => void,
  onError?: (err: unknown) => void
): Unsubscribe {
  // TODO: implement real-time listener (onSnapshot).
  const noop: Unsubscribe = () => {};
  return noop;
}

export async function upsertGrade(gradeData: Omit<Grade, "gradeId"> & { gradeId?: string }): Promise<void> {
  // TODO: implement create-or-update grade entry.
  return;
}

// NOTE: The imports at the top are intentionally kept so that when you implement the
// stubs, the file already has the right Firestore primitives available.

export { serverTimestamp, collection, doc, getDoc, onSnapshot, query, updateDoc, where };

