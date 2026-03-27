"use client";

import React from "react";
import Link from "next/link";

type TabKey = "overview" | "chat" | "grades";

export default function CourseTabs({
  syllabusId,
  active
}: Readonly<{
  syllabusId: string;
  active: TabKey;
}>) {
  const tabs: Array<{ key: TabKey; label: string; href: string }> = [
    { key: "overview", label: "Overview", href: `/course/${syllabusId}` },
    { key: "chat", label: "Chat", href: `/course/${syllabusId}/chat` },
    { key: "grades", label: "Grades", href: `/course/${syllabusId}/grades` }
  ];

  return (
    <div>
      {/* Back to dashboard */}
      <div className="max-w-5xl mx-auto px-4 pt-4">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-[#9CA3AF] transition hover:text-[#F9FAFB]"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
            <path fillRule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clipRule="evenodd" />
          </svg>
          Dashboard
        </Link>
      </div>

      <nav className="mt-3 border-b border-neutral-800">
        <div className="max-w-5xl mx-auto px-4 flex gap-6">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={[
                "py-3 text-sm font-semibold transition border-b-2 -mb-px",
                isActive
                  ? "text-primary-blue border-primary-blue"
                  : "text-neutral-400 hover:text-neutral-200 border-transparent",
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
        </div>
      </nav>
    </div>
  );
}

