"use client";

import React, { useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import useAuth from "@/hooks/useAuth";
import CourseTabs from "@/components/layout/CourseTabs";
import ChatMessage from "@/components/chat/ChatMessage";
import ChatInput from "@/components/chat/ChatInput";
import type { ChatMessage as ChatMessageType } from "@/types";

export default function CourseChatPage() {
  const router = useRouter();
  const params = useParams<{ syllabusId: string }>();
  const syllabusId = params?.syllabusId;
  const { user, loading } = useAuth();

  const [messages, setMessages] = useState<ChatMessageType[]>([]);
  const [streaming, setStreaming] = useState(false);

  const suggestedQuestions = useMemo(() => {
    return ["What's the late policy?", "How is my grade calculated?", "When is the final exam?"];
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary-blue/40 border-t-primary-blue rounded-full animate-spin" />
      </div>
    );
  }

  if (!user?.userId || !syllabusId) {
    router.replace("/login");
    return null;
  }

  const onSend = async (question: string) => {
    const userMsg: ChatMessageType = {
      id: crypto.randomUUID(),
      role: "user",
      content: question,
      timestamp: new Date()
    };
    setMessages((prev) => [...prev, userMsg]);

    setStreaming(true);
    try {
      // TODO: Implement proper streaming decode of `/api/chat` response.
      // For scaffolding, call the endpoint and show a placeholder response.
      await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, syllabusId })
      });

      const aiMsg: ChatMessageType = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "TODO: Streamed answer will appear here with citations.",
        citation: "TODO: Citation excerpt will be shown here.",
        timestamp: new Date()
      };
      setMessages((prev) => [...prev, aiMsg]);
    } finally {
      setStreaming(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="max-w-5xl mx-auto px-4 py-8">
        <div className="flex items-center justify-between gap-4">
          <div>
            <div className="text-3xl font-extrabold text-neutral-100">Course Chat</div>
            <div className="text-neutral-400 text-sm mt-1">Ask questions about your syllabus.</div>
          </div>
        </div>

        <CourseTabs syllabusId={syllabusId} active="chat" />

        <section className="mt-6 rounded-2xl border border-neutral-800 bg-neutral-900/30 overflow-hidden">
          <div className="p-6 h-[60vh] overflow-auto">
            {messages.length === 0 ? (
              <div className="text-neutral-500 text-sm">
                Start by asking a question.
              </div>
            ) : null}

            {messages.map((m) => (
              <ChatMessage key={m.id} message={m} isStreaming={streaming} />
            ))}
          </div>
          <ChatInput
            onSend={(q) => void onSend(q)}
            disabled={streaming}
            suggestedQuestions={messages.length === 0 ? suggestedQuestions : []}
          />
        </section>
      </main>
    </div>
  );
}

