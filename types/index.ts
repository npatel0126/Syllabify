export interface User {
  userId: string;
  email?: string;
  phone?: string;
  reminderStyle?: "aggressive" | "moderate" | "light";
  calendarToken?: string; // encrypted Google OAuth refresh token
  timezone?: string;
  createdAt?: unknown;
}

export interface Syllabus {
  syllabusId: string;
  userId: string;
  courseName: string;
  professor?: string;
  semester?: string;
  pdfUrl?: string;
  pineconeNamespace?: string;
  status: "uploading" | "processing" | "ready" | "error";
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type AssignmentType = "exam" | "paper" | "quiz" | "lab" | "homework";

export interface Assignment {
  assignmentId: string;
  syllabusId: string;
  userId: string;
  title: string;
  type: AssignmentType;
  dueDate?: unknown; // Firestore Timestamp or ISO string
  dueDateConfirmed?: boolean;
  gradeWeight?: number; // 0-100
  notes?: string;
  calendarEventId?: string;
  reminderTaskIds?: string[];
}

export interface Grade {
  gradeId: string;
  assignmentId: string;
  userId: string;
  syllabusId: string;
  scoreEarned?: number;
  scoreMax?: number;
  percentageScore?: number;
  targetGrade?: string; // e.g. "A-", "B+"
  loggedAt?: unknown;
}

export type ChatMessageRole = "user" | "assistant";

export interface ChatMessage {
  id: string;
  role: ChatMessageRole;
  content: string;
  citation?: string;
  timestamp?: unknown;
}

