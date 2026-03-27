// Date utilities for UI formatting and reminder logic.
import type { Timestamp } from "firebase/firestore";

/** Convert a Firestore Timestamp, JS Date, or ISO string to a JS Date. */
function toDate(value: Timestamp | Date | string | unknown): Date | null {
  if (!value) return null;
  if (value instanceof Date) return value;
  // Firestore Timestamp has a .toDate() method
  if (typeof (value as Timestamp).toDate === "function") {
    return (value as Timestamp).toDate();
  }
  if (typeof value === "string" || typeof value === "number") {
    const d = new Date(value);
    return isNaN(d.getTime()) ? null : d;
  }
  return null;
}

export function formatDueDate(timestamp: Timestamp | Date | unknown): string {
  const d = toDate(timestamp);
  if (!d) return "No due date";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export function formatRelativeDate(timestamp: Timestamp | Date | unknown): string {
  const d = toDate(timestamp);
  if (!d) return "";
  const days = getDaysUntil(timestamp);
  if (days < 0) return `${Math.abs(days)} day${Math.abs(days) !== 1 ? "s" : ""} ago`;
  if (days === 0) return "Today";
  if (days === 1) return "Tomorrow";
  return `in ${days} days`;
}

export function isOverdue(timestamp: Timestamp | Date | unknown): boolean {
  const d = toDate(timestamp);
  if (!d) return false;
  return d < new Date();
}

export function getDaysUntil(timestamp: Timestamp | Date | unknown): number {
  const d = toDate(timestamp);
  if (!d) return 0;
  const now = new Date();
  const nowMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const thenMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((thenMidnight.getTime() - nowMidnight.getTime()) / 86_400_000);
}

