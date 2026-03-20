"use client";

import React, { useEffect, useMemo, useState } from "react";
import type { ChatMessage as ChatMessageType } from "@/types";

export default function ChatMessage({
  message,
  isStreaming = false
}: Readonly<{
  message: ChatMessageType;
  isStreaming?: boolean;
}>) {
  const [rendered, setRendered] = useState("");

  const fullContent = useMemo(() => message.content ?? "", [message.content]);

  useEffect(() => {
    // TODO: Replace with token-by-token streaming when wired to API streaming.
    if (!isStreaming) {
      setRendered(fullContent);
      return;
    }
    setRendered(fullContent);
  }, [fullContent, isStreaming]);

  const isUser = message.role === "user";

  return (
    <div className={["flex mb-4", isUser ? "justify-end" : "justify-start"].join(" ")}>
      <div className={["max-w-[85%] rounded-2xl px-4 py-3 border", isUser ? "bg-primary-blue/15 border-primary-blue/30 text-neutral-100" : "bg-neutral-800/40 border-neutral-700 text-neutral-100"].join(" ")}>
        <div className="whitespace-pre-wrap break-words text-sm leading-relaxed">{rendered}</div>

        {message.citation ? (
          <details className="mt-2 text-xs text-neutral-400">
            <summary className="cursor-pointer select-none font-semibold text-neutral-300">
              Source
            </summary>
            <div className="mt-2 rounded-lg border border-neutral-700 bg-neutral-900/40 p-3">
              {message.citation}
            </div>
          </details>
        ) : null}
      </div>
    </div>
  );
}

