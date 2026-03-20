"use client";

import React, { useEffect, useMemo, useState } from "react";

type ToastVariant = "success" | "error" | "warning" | "info";

export type ToastItem = {
  id: string;
  title?: string;
  message: string;
  variant: ToastVariant;
};

const variantToClasses: Record<ToastVariant, { bg: string; border: string; text: string }> = {
  success: { bg: "bg-green-500/15", border: "border-green-500/30", text: "text-green-200" },
  error: { bg: "bg-red-500/15", border: "border-red-500/30", text: "text-red-200" },
  warning: { bg: "bg-yellow-500/15", border: "border-yellow-500/30", text: "text-yellow-200" },
  info: { bg: "bg-primary-blue/15", border: "border-primary-blue/30", text: "text-primary-blue" }
};

export function Toast({
  item,
  onDismiss
}: Readonly<{
  item: ToastItem;
  onDismiss: (id: string) => void;
}>) {
  const classes = variantToClasses[item.variant];

  useEffect(() => {
    const t = window.setTimeout(() => onDismiss(item.id), 4000);
    return () => window.clearTimeout(t);
  }, [item.id, onDismiss]);

  return (
    <div className={["rounded-xl border p-3 shadow-lg flex gap-3 items-start", classes.bg, classes.border, classes.text].join(" ")}>
      <div className="font-bold">{item.title ?? "Notification"}</div>
      <div className="text-sm leading-snug flex-1">{item.message}</div>
      <button onClick={() => onDismiss(item.id)} className="text-neutral-400 hover:text-neutral-200">
        X
      </button>
    </div>
  );
}

// Global container rendered by `app/layout.tsx`.
export default function Toaster() {
  // TODO: wire up a global toast bus via context.
  const [items, setItems] = useState<ToastItem[]>([]);
  const dismiss = (id: string) => setItems((prev) => prev.filter((t) => t.id !== id));

  // Placeholder so it renders safely even without real toast calls.
  const rendered = useMemo(() => items, [items]);
  void rendered;

  if (items.length === 0) {
    return <div aria-hidden className="fixed top-4 right-4 z-50 w-full max-w-sm" />;
  }

  return (
    <div className="fixed top-4 right-4 z-50 w-full max-w-sm flex flex-col gap-2">
      {items.map((item) => (
        <Toast key={item.id} item={item} onDismiss={dismiss} />
      ))}
    </div>
  );
}

