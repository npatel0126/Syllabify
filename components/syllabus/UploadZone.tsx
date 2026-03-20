"use client";

import React, { useCallback, useState } from "react";
import Button from "@/components/ui/Button";
import validatePDF from "@/lib/utils/validation";

export default function UploadZone({
  onUpload
}: Readonly<{
  onUpload: (file: File) => Promise<void> | void;
}>) {
  const [isUploading, setIsUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);

      // Basic scaffolding validation (PDF only, 20MB max).
      // TODO: Replace with real `validatePDF` import once utilities are fully wired.
      const res = validatePDF(file as any);
      if (!res.valid) {
        setError(res.error ?? "Invalid file");
        return;
      }

      setIsUploading(true);
      try {
        await onUpload(file);
      } finally {
        setIsUploading(false);
      }
    },
    [onUpload]
  );

  return (
    <section
      className={[
        "rounded-2xl border-2 border-dashed p-8 text-center transition",
        dragOver ? "border-primary-blue/80 bg-primary-blue/5" : "border-neutral-700 bg-neutral-900/20"
      ].join(" ")}
      onDragEnter={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragOver(true);
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void handleFile(file);
      }}
    >
      <div className="mx-auto max-w-md">
        <div className="text-neutral-200 font-bold">Upload your syllabus PDF</div>
        <div className="mt-2 text-sm text-neutral-400">Drag and drop or choose a file.</div>
        {error ? <div className="mt-4 text-sm text-red-400">{error}</div> : null}

        <div className="mt-5 flex items-center justify-center gap-3">
          <label className="cursor-pointer">
            <input
              type="file"
              accept="application/pdf"
              className="hidden"
              disabled={isUploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleFile(file);
              }}
            />
            <Button variant="primary" size="md" isLoading={isUploading}>
              Upload
            </Button>
          </label>
        </div>
      </div>
    </section>
  );
}

