import {
  collection,
  doc,
  addDoc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  where,
  serverTimestamp,
} from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import type { Assignment, Grade, Syllabus, User } from "@/types";

// ─── Users ────────────────────────────────────────────────────────────────────

export async function getUserDoc(userId: string): Promise<User | null> {
  const snap = await getDoc(doc(db, "users", userId));
  if (!snap.exists()) return null;
  return { userId: snap.id, ...snap.data() } as User;
}

export async function updateUserDoc(userId: string, data: Partial<User>): Promise<void> {
  await updateDoc(doc(db, "users", userId), { ...data });
}

// ─── Syllabi ──────────────────────────────────────────────────────────────────

export function getSyllabi(
  userId: string,
  onData: (syllabi: Syllabus[]) => void,
  onError?: (e: unknown) => void
): () => void {
  const q = query(collection(db, "syllabi"), where("userId", "==", userId));
  return onSnapshot(
    q,
    (snap) => {
      const syllabi = snap.docs.map((d) => ({ syllabusId: d.id, ...d.data() } as Syllabus));
      onData(syllabi);
    },
    (err) => onError?.(err)
  );
}

export async function getSyllabusById(syllabusId: string): Promise<Syllabus | null> {
  const snap = await getDoc(doc(db, "syllabi", syllabusId));
  if (!snap.exists()) return null;
  return { syllabusId: snap.id, ...snap.data() } as Syllabus;
}

export async function createSyllabus(
  data: Omit<Syllabus, "syllabusId" | "createdAt" | "updatedAt">
): Promise<string> {
  const ref = await addDoc(collection(db, "syllabi"), {
    ...data,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updateSyllabus(
  syllabusId: string,
  data: Partial<Omit<Syllabus, "syllabusId">>
): Promise<void> {
  await updateDoc(doc(db, "syllabi", syllabusId), {
    ...data,
    updatedAt: serverTimestamp(),
  });
}

export async function deleteSyllabus(syllabusId: string): Promise<void> {
  // Delete the syllabus doc itself
  await deleteDoc(doc(db, "syllabi", syllabusId));

  // Batch-delete all assignments that belong to this syllabus
  const assignSnap = await getDocs(
    query(collection(db, "assignments"), where("syllabusId", "==", syllabusId))
  );
  if (!assignSnap.empty) {
    const batch = writeBatch(db);
    assignSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }

  // Batch-delete all grades that belong to this syllabus
  const gradeSnap = await getDocs(
    query(collection(db, "grades"), where("syllabusId", "==", syllabusId))
  );
  if (!gradeSnap.empty) {
    const batch = writeBatch(db);
    gradeSnap.docs.forEach((d) => batch.delete(d.ref));
    await batch.commit();
  }
}

// ─── Assignments ──────────────────────────────────────────────────────────────

export function getAssignments(
  syllabusId: string,
  onData: (assignments: Assignment[]) => void,
  onError?: (e: unknown) => void
): () => void {
  // Note: no orderBy here — avoids requiring a composite index in the emulator.
  // We sort client-side instead.
  const q = query(
    collection(db, "assignments"),
    where("syllabusId", "==", syllabusId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const assignments = snap.docs
        .map((d) => ({ assignmentId: d.id, ...d.data() } as Assignment))
        .sort((a, b) => {
          // Sort by dueDate ascending; nulls last
          const aDate = (a.dueDate as unknown as { toDate?: () => Date } | null)?.toDate?.()?.getTime() ?? Infinity;
          const bDate = (b.dueDate as unknown as { toDate?: () => Date } | null)?.toDate?.()?.getTime() ?? Infinity;
          return aDate - bDate;
        });
      onData(assignments);
    },
    (err) => onError?.(err)
  );
}

export async function updateAssignment(
  assignmentId: string,
  data: Partial<Omit<Assignment, "assignmentId">>
): Promise<void> {
  await updateDoc(doc(db, "assignments", assignmentId), { ...data });
}

// ─── Grades ───────────────────────────────────────────────────────────────────

export function getGrades(
  syllabusId: string,
  userId: string,
  onData: (grades: Grade[]) => void,
  onError?: (e: unknown) => void
): () => void {
  const q = query(
    collection(db, "grades"),
    where("syllabusId", "==", syllabusId),
    where("userId", "==", userId)
  );
  return onSnapshot(
    q,
    (snap) => {
      const grades = snap.docs.map((d) => ({ gradeId: d.id, ...d.data() } as Grade));
      onData(grades);
    },
    (err) => onError?.(err)
  );
}

export async function upsertGrade(
  gradeData: Omit<Grade, "gradeId" | "loggedAt"> & { gradeId?: string }
): Promise<void> {
  const { gradeId, ...rest } = gradeData;
  if (gradeId) {
    await updateDoc(doc(db, "grades", gradeId), { ...rest, loggedAt: serverTimestamp() });
  } else {
    await addDoc(collection(db, "grades"), { ...rest, loggedAt: serverTimestamp() });
  }
}

