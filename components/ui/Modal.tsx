"use client";

import React, { useEffect } from "react";

export default function Modal({
  isOpen,
  onClose,
  title,
  children
}: Readonly<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}>) {
  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative max-w-lg mx-auto mt-20 bg-neutral-900 border border-neutral-800 rounded-xl shadow-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-neutral-800 flex items-center justify-between">
          <h2 className="font-bold text-neutral-100">{title}</h2>
          <button onClick={onClose} className="text-neutral-400 hover:text-neutral-200">
            Close
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

