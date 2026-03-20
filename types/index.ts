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
  calendarToken: string; // encrypted Google OAuth refresh token (store encrypted)
  timezone: string;
  createdAt: Date | unknown;
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
  createdAt: Date | unknown;
  updatedAt: Date | unknown;
}

export interface Assignment {
  assignmentId: string;
  syllabusId: string;
  userId: string;
  title: string;
  type: AssignmentType;
  dueDate: Date | unknown;
  dueDateConfirmed: boolean;
  gradeWeight: number; // 0-100
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
  loggedAt: Date | unknown;
}

export interface ChatMessage {
  id: string;
  role: Role;
  content: string;
  citation?: string;
  timestamp: Date | unknown;
}

