"use client";

import React, { useMemo, useState } from "react";
import Button from "@/components/ui/Button";

export default function ChatInput({
  onSend,
  disabled,
  suggestedQuestions = []
}: Readonly<{
  onSend: (question: string) => Promise<void> | void;
  disabled?: boolean;
  suggestedQuestions?: string[];
}>) {
  const [text, setText] = useState("");
  const remaining = 1000 - text.length;

  const send = async () => {
    const q = text.trim();
    if (!q || disabled) return;
    await onSend(q);
    setText("");
  };

  const chips = useMemo(() => suggestedQuestions.slice(0, 3), [suggestedQuestions]);

  return (
    <div className="border-t border-neutral-800 bg-neutral-900/20 px-4 py-3">
      {chips.length > 0 && !text.trim() ? (
        <div className="flex flex-wrap gap-2 mb-3">
          {chips.map((q) => (
            <button
              key={q}
              type="button"
              className="rounded-full border border-neutral-700 bg-neutral-900/40 px-3 py-1 text-xs text-neutral-200 hover:border-neutral-600 hover:text-neutral-100 transition"
              onClick={() => setText(q)}
            >
              {q}
            </button>
          ))}
        </div>
      ) : null}

      <div className="flex items-end gap-2">
        <textarea
          value={text}
          disabled={disabled}
          rows={1}
          onChange={(e) => setText(e.target.value)}
          placeholder="Ask about your syllabus..."
          className={[
            "flex-1 rounded-xl bg-neutral-800/40 border border-neutral-700 px-3 py-2 text-sm outline-none",
            "focus:ring-2 focus:ring-primary-blue/25"
          ].join(" ")}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
        />
        <Button variant="primary" size="md" onClick={() => void send()} disabled={disabled}>
          Send
        </Button>
      </div>
      <div className="mt-2 text-xs text-neutral-500 flex items-center justify-between">
        <span>Enter to send. Shift+Enter for newline.</span>
        <span>{remaining} chars</span>
      </div>
    </div>
  );
}

