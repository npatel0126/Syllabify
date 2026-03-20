"use client";

import React from "react";

export default function Spinner({
  size = "md"
}: Readonly<{
  size?: "sm" | "md" | "lg";
}>) {
  const dims = size === "sm" ? 16 : size === "lg" ? 40 : 24;
  return (
    <span
      aria-label="Loading"
      className="inline-block animate-spin rounded-full border-2 border-primary-blue/40 border-t-primary-blue"
      style={{ width: dims, height: dims }}
    />
  );
}

