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
    <nav className="mt-6 border-b border-neutral-800">
      <div className="max-w-5xl mx-auto flex gap-6">
        {tabs.map((t) => {
          const isActive = t.key === active;
          return (
            <Link
              key={t.key}
              href={t.href}
              className={[
                "py-3 text-sm font-semibold transition",
                isActive ? "text-primary-blue" : "text-neutral-400 hover:text-neutral-200"
              ].join(" ")}
            >
              {t.label}
            </Link>
          );
        })}
      </div>
      {/* TODO: underline indicator */}
    </nav>
  );
}

