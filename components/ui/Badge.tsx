"use client";

import React from "react";
import type { AssignmentType } from "@/types";

type BadgeSize = "sm" | "md";

const typeToClasses: Record<AssignmentType, { bg: string; text: string; border: string }> = {
  exam: { bg: "bg-red-500/15", text: "text-red-200", border: "border-red-400/40" },
  paper: { bg: "bg-primary-blue/15", text: "text-primary-blue", border: "border-primary-blue/40" },
  quiz: { bg: "bg-yellow-500/15", text: "text-yellow-200", border: "border-yellow-400/40" },
  lab: { bg: "bg-green-500/15", text: "text-green-200", border: "border-green-400/40" },
  homework: { bg: "bg-neutral-500/15", text: "text-neutral-200", border: "border-neutral-400/40" }
};

export default function Badge({
  children,
  type,
  size = "md",
  className = ""
}: Readonly<{
  children: React.ReactNode;
  type: AssignmentType;
  size?: BadgeSize;
  className?: string;
}>) {
  const sizeClasses = size === "sm" ? "px-2 py-0.5 text-xs" : "px-2.5 py-1 text-sm";
  const t = typeToClasses[type];

  return (
    <span
      className={[
        "inline-flex items-center rounded-full border font-semibold",
        sizeClasses,
        t.bg,
        t.text,
        t.border,
        className
      ].join(" ")}
    >
      {children}
    </span>
  );
}

