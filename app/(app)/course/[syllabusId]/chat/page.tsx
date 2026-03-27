"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { collection, addDoc, onSnapshot, orderBy, query, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useFirebaseAuth } from "@/lib/firebase/auth-context";
import ChatInput from "@/components/chat/ChatInput";
import ChatMessageBubble from "@/components/chat/ChatMessage";
import CourseTabs from "@/components/layout/CourseTabs";
import Spinner from "@/components/ui/Spinner";
import type { ChatMessage } from "@/types";

const SUGGESTED = [
  "What are the exam dates?",
  "How is my final grade calculated?",
  "What is the late submission policy?",
];

export default function ChatPage() {
  const params = useParams();
  const syllabusId = typeof params.syllabusId === "string" ? params.syllabusId : "";
  const router = useRouter();
  const { user, loading: authLoading } = useFirebaseAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [streamingContent, setStreamingContent] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  // Real-time chat history from Firestore
  useEffect(() => {
    if (!syllabusId || !user) return;
    setMessagesLoading(true);
    const q = query(
      collection(db, "syllabi", syllabusId, "chats"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      const msgs = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ChatMessage));
      setMessages(msgs);
      setMessagesLoading(false);
    });
    return () => unsub();
  }, [syllabusId, user]);

  // Auto-scroll on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingContent]);

  const handleSend = useCallback(
    async (question: string) => {
      if (!user || !syllabusId || isStreaming) return;

      // Persist user message
      const chatsRef = collection(db, "syllabi", syllabusId, "chats");
      await addDoc(chatsRef, {
        role: "user",
        content: question,
        timestamp: serverTimestamp(),
      });

      // Call streaming API
      setIsStreaming(true);
      setStreamingContent("");

      try {
        const token = await user.getIdToken();
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ question, syllabusId }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`API error: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let fullContent = "";
        let citation = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          fullContent += chunk;
          // Naive citation extraction: last line starting with "SOURCE:"
          const lines = fullContent.split("\n");
          const sourceLine = lines.findLast((l) => l.startsWith("SOURCE:"));
          if (sourceLine) {
            citation = sourceLine.replace("SOURCE:", "").trim();
            setStreamingContent(lines.filter((l) => !l.startsWith("SOURCE:")).join("\n"));
          } else {
            setStreamingContent(fullContent);
          }
        }

        // Persist assistant reply
        await addDoc(chatsRef, {
          role: "assistant",
          content: streamingContent || fullContent,
          citation: citation || undefined,
          timestamp: serverTimestamp(),
        });
      } catch (err) {
        console.error("Chat error:", err);
        await addDoc(collection(db, "syllabi", syllabusId, "chats"), {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
          timestamp: serverTimestamp(),
        });
      } finally {
        setIsStreaming(false);
        setStreamingContent("");
      }
    },
    [user, syllabusId, isStreaming, streamingContent]
  );

  if (authLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-[#0A0A0A]">
        <Spinner />
      </main>
    );
  }
  if (!user) return null;

  // Build the streaming bubble for display
  const streamingMessage: ChatMessage | null = isStreaming
    ? {
        id: "__streaming__",
        role: "assistant",
        content: streamingContent || "…",
        timestamp: null as unknown as import("firebase/firestore").Timestamp,
      }
    : null;

  return (
    <main className="min-h-screen bg-[#0A0A0A] flex flex-col">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="border-b border-neutral-800 bg-neutral-900/30 px-4 pt-8 pb-0 flex-shrink-0">
        <div className="mx-auto max-w-5xl">
          <button
            onClick={() => router.push("/dashboard")}
            className="mb-4 flex items-center gap-1 text-sm text-neutral-400 hover:text-neutral-200 transition"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </button>
          <h1 className="text-2xl font-bold text-neutral-100">Chat</h1>
          <p className="text-xs text-neutral-500 mt-0.5 mb-1">Ask anything about your syllabus</p>
          <CourseTabs syllabusId={syllabusId} active="chat" />
        </div>
      </div>

      {/* ── Messages ───────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-3xl">
          {messagesLoading && (
            <div className="flex justify-center py-8"><Spinner /></div>
          )}

          {!messagesLoading && messages.length === 0 && !isStreaming && (
            <div className="flex flex-col items-center gap-4 py-16 text-center">
              <div className="h-14 w-14 rounded-2xl border border-neutral-800 bg-neutral-900/60 flex items-center justify-center">
                <svg className="h-7 w-7 text-neutral-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.625 12a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H8.25m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0H12m4.125 0a.375.375 0 11-.75 0 .375.375 0 01.75 0zm0 0h-.375M21 12c0 4.556-4.03 8.25-9 8.25a9.764 9.764 0 01-2.555-.337A5.972 5.972 0 015.41 20.97a5.969 5.969 0 01-.474-.065 4.48 4.48 0 00.978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-200">Ask your syllabus anything</p>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs">
                  Get instant answers about policies, due dates, grade weights, and more.
                </p>
              </div>
            </div>
          )}

          {messages.map((msg) => (
            <ChatMessageBubble key={msg.id} message={msg} />
          ))}

          {streamingMessage && (
            <ChatMessageBubble message={streamingMessage} isStreaming />
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* ── Input ──────────────────────────────────────────────────────── */}
      <div className="flex-shrink-0 mx-auto w-full max-w-3xl">
        <ChatInput
          onSend={handleSend}
          disabled={isStreaming}
          suggestedQuestions={messages.length === 0 ? SUGGESTED : []}
        />
      </div>
    </main>
  );
}
