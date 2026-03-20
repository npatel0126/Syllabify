"use client";

import React from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";

export default function Navbar({
  userName,
  userEmail,
  onSignOut
}: Readonly<{
  userName?: string | null;
  userEmail?: string | null;
  onSignOut?: () => void;
}>) {
  return (
    <header className="w-full border-b border-neutral-800 bg-neutral-900/40 backdrop-blur">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
        <Link href="/" className="font-extrabold text-primary-blue">
          Syllabify
        </Link>
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end">
            <div className="text-sm font-semibold text-neutral-100">{userName ?? "Student"}</div>
            <div className="text-xs text-neutral-400">{userEmail ?? ""}</div>
          </div>
          <Button variant="secondary" size="sm" onClick={onSignOut}>
            Sign out
          </Button>
        </div>
      </div>
    </header>
  );
}

