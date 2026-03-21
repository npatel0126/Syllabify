import type { Timestamp } from "firebase/firestore";

export type ReminderStyle = "aggressive" | "moderate" | "light";
export type SyllabusStatus = "uploading" | "processing" | "ready" | "error";
export type AssignmentType = "exam" | "paper" | "quiz" | "lab" | "homework";
export type Role = "user" | "assistant";
export type TargetGrade =
  | "A+"
  | "A"
  | "A-"
  | "B+"
  | "B"
  | "B-"
  | "C+"
  | "C"
  | "C-";

export interface User {
  userId: string;
  email: string;
  phone: string;
  reminderStyle: ReminderStyle;
  calendarToken: string;
  timezone: string;
  createdAt: Timestamp;
}

export interface Syllabus {
  syllabusId: string;
  userId: string;
  courseName: string;
  professor: string;
  semester: string;
  pdfUrl: string;
  pineconeNamespace: string;
  status: SyllabusStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Assignment {
  assignmentId: string;
  syllabusId: string;
  userId: string;
  title: string;
  type: AssignmentType;
  dueDate: Timestamp;
  dueDateConfirmed: boolean;
  gradeWeight: number;
  notes: string;
  calendarEventId: string;
  reminderTaskIds: string[];
}

export interface Grade {
  gradeId: string;
  assignmentId: string;
  userId: string;
  syllabusId: string;
  scoreEarned: number;
  scoreMax: number;
  percentageScore: number;
  targetGrade: TargetGrade;
  loggedAt: Timestamp;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  citation?: string;
  timestamp: Timestamp;
}

