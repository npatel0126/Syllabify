"use client";

import { useRef, useState, useCallback } from "react";
import { uploadPDF } from "@/lib/firebase/storage";
import { updateSyllabus } from "@/lib/firebase/firestore";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";

const MAX_SIZE_BYTES = 20 * 1024 * 1024; // 20 MB

type UploadState = "idle" | "dragover" | "uploading" | "success" | "error";

interface UploadZoneProps {
  /** Called after the PDF is stored and the Firestore doc is marked "processing". */
  onUploadComplete?: (downloadUrl: string, syllabusId: string) => void;
}

export default function UploadZone({ onUploadComplete }: UploadZoneProps) {
  const { user } = useFirebaseAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<UploadState>("idle");
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  function validate(file: File): string | null {
    if (file.type !== "application/pdf") return "Only PDF files are accepted.";
    if (file.size > MAX_SIZE_BYTES) return "File exceeds the 20 MB limit.";
    return null;
  }

  const handleFile = useCallback(
    async (file: File) => {
      const validationError = validate(file);
      if (validationError) {
        setErrorMsg(validationError);
        setState("error");
        return;
      }

      if (!user) {
        setErrorMsg("You must be signed in to upload.");
        setState("error");
        return;
      }

      setState("uploading");
      setProgress(0);
      setErrorMsg(null);

      try {
        // ── Step 1: create Firestore doc, get real syllabusId ────────────────
        const res = await fetch("/api/upload-syllabus", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userId: user.uid, courseName: file.name.replace(/\.pdf$/i, "") }),
        });

        if (!res.ok) {
          const { error } = await res.json().catch(() => ({}));
          throw new Error(error ?? `API error ${res.status}`);
        }

        const { syllabusId } = (await res.json()) as { syllabusId: string };

        // ── Step 2: upload PDF to Storage using syllabusId as filename ────────
        const { downloadUrl } = await uploadPDF(file, user.uid, syllabusId, (pct) => {
          setProgress(pct);
        });

        // ── Step 3: update Firestore doc with the download URL ────────────────
        await updateSyllabus(syllabusId, { pdfUrl: downloadUrl, status: "processing" });

        setState("success");
        onUploadComplete?.(downloadUrl, syllabusId);
      } catch (err) {
        console.error("[UploadZone]", err);
        setErrorMsg(err instanceof Error ? err.message : "Upload failed. Please try again.");
        setState("error");
      }
    },
    [user, onUploadComplete]
  );

  // ── Drag events ─────────────────────────────────────────────────────────────
  function onDragOver(e: React.DragEvent) {
    e.preventDefault();
    if (state !== "uploading" && state !== "success") setState("dragover");
  }

  function onDragLeave() {
    if (state === "dragover") setState("idle");
  }

  function onDrop(e: React.DragEvent) {
    e.preventDefault();
    if (state === "uploading" || state === "success") return;
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }

  function onInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = "";
  }

  function reset() {
    setState("idle");
    setProgress(0);
    setErrorMsg(null);
  }

  // ── Derived styles ───────────────────────────────────────────────────────────
  const isError = state === "error";
  const isDragover = state === "dragover";

  const borderColor = isError
    ? "border-red-500"
    : isDragover
    ? "border-[#4ADE80]"
    : "border-[#4ADE80]/50";

  const bgColor = isError
    ? "bg-red-950/30"
    : isDragover
    ? "bg-[#052e16]"
    : "bg-[#0A0A0A]";

  const shadow = isDragover ? "shadow-[0_0_20px_2px_rgba(74,222,128,0.25)]" : "";

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload PDF syllabus"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => state !== "uploading" && state !== "success" && inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      className={[
        "relative flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed",
        "w-full min-h-[220px] cursor-pointer select-none transition-all duration-200 px-6 py-10",
        borderColor,
        bgColor,
        shadow,
      ].join(" ")}
    >
      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        aria-label="Select a PDF syllabus file"
        title="Select a PDF syllabus file"
        className="hidden"
        onChange={onInputChange}
      />

      {/* ── Idle / Dragover ──────────────────────────────────────────────────── */}
      {(state === "idle" || state === "dragover") && (
        <>
          <svg
            className={`h-10 w-10 transition-colors ${isDragover ? "text-[#4ADE80]" : "text-[#4ADE80]/50"}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 16v-8m0 0-3 3m3-3 3 3M4.5 19.5h15A2.25 2.25 0 0 0 21.75 17V9a2.25 2.25 0 0 0-2.25-2.25H4.5A2.25 2.25 0 0 0 2.25 9v8a2.25 2.25 0 0 0 2.25 2.25Z" />
          </svg>
          <p className="text-sm text-[#9CA3AF]">Drop your syllabus PDF here</p>
          <p className="text-xs text-[#4ADE80]">or click to browse</p>
          <p className="text-xs text-[#4B5563]">PDF only · max 20 MB</p>
        </>
      )}

      {/* ── Uploading ───────────────────────────────────────────────────────── */}
      {state === "uploading" && (
        <div className="flex w-full max-w-xs flex-col items-center gap-3">
          <p className="text-sm text-[#9CA3AF]">Uploading… {progress}%</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-[#1F1F1F]">
            <div
              className="h-full rounded-full bg-[#4ADE80] transition-all duration-150"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* ── Success ─────────────────────────────────────────────────────────── */}
      {state === "success" && (
        <>
          <svg className="h-10 w-10 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <p className="text-sm font-medium text-[#4ADE80]">Syllabus uploaded successfully</p>
        </>
      )}

      {/* ── Error ───────────────────────────────────────────────────────────── */}
      {state === "error" && (
        <>
          <svg className="h-10 w-10 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
          </svg>
          <p className="text-sm text-red-400">{errorMsg}</p>
          <button
            onClick={(e) => { e.stopPropagation(); reset(); }}
            className="mt-1 rounded-lg border border-red-800 px-4 py-1.5 text-xs text-red-400 hover:bg-red-950 transition"
          >
            Try again
          </button>
        </>
      )}
    </div>
  );
}
