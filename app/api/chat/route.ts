import { NextRequest } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { adminAuth, adminDb } from "@/lib/firebase/admin";

const genai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY ?? "" });

/** Optionally retrieve RAG chunks from Pinecone if credentials are set. */
async function queryPinecone(
  namespace: string,
  question: string,
  topK = 4
): Promise<string[]> {
  const apiKey = process.env.PINECONE_API_KEY;
  const indexHost = process.env.PINECONE_INDEX_HOST; // e.g. https://syllabify-xxxx.svc.environment.pinecone.io
  if (!apiKey || !indexHost) return [];

  try {
    // Embed the question with Gemini text-embedding-004
    const embedRes = await genai.models.embedContent({
      model: "text-embedding-004",
      contents: question,
    });
    const vector = embedRes.embeddings?.[0]?.values ?? [];

    // Query Pinecone via REST (avoids shipping the SDK to the edge)
    const res = await fetch(`${indexHost}/query`, {
      method: "POST",
      headers: {
        "Api-Key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ vector, topK, namespace, includeMetadata: true }),
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { matches?: Array<{ metadata?: { text?: string }; score?: number }> };
    return (json.matches ?? [])
      .filter((m) => (m.score ?? 0) > 0.3)
      .map((m) => m.metadata?.text ?? "")
      .filter(Boolean);
  } catch (err) {
    console.warn("Pinecone query failed (non-fatal):", err);
    return [];
  }
}

// POST /api/chat
// Body: { question: string, syllabusId: string }
export async function POST(req: NextRequest) {
  // ── Auth ──────────────────────────────────────────────────────────────────
  const authorization = req.headers.get("authorization") ?? "";
  const token = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";

  let userId: string;
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    userId = decoded.uid;
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = (await req.json()) as { question?: string; syllabusId?: string };
  const question = (body.question ?? "").trim();
  const syllabusId = (body.syllabusId ?? "").trim();

  if (!question || !syllabusId) {
    return new Response(JSON.stringify({ error: "question and syllabusId are required" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // ── Fetch syllabus context from Firestore ─────────────────────────────────
  let syllabusContext = "";
  try {
    const syllabusSnap = await adminDb.collection("syllabi").doc(syllabusId).get();
    if (!syllabusSnap.exists || syllabusSnap.data()?.userId !== userId) {
      return new Response(JSON.stringify({ error: "Not found" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const data = syllabusSnap.data()!;
    syllabusContext = `Course: ${data.courseName ?? "Unknown"}\nProfessor: ${data.professor ?? "Unknown"}\nSemester: ${data.semester ?? "Unknown"}`;

    // Pull assignments as additional context
    const assignmentsSnap = await adminDb
      .collection("assignments")
      .where("syllabusId", "==", syllabusId)
      .orderBy("dueDate", "asc")
      .limit(40)
      .get();

    if (!assignmentsSnap.empty) {
      syllabusContext += "\n\nAssignments:\n";
      assignmentsSnap.docs.forEach((d) => {
        const a = d.data();
        syllabusContext += `- ${a.title} (${a.type}, ${a.gradeWeight}% weight, due: ${a.dueDate ?? "TBD"})\n`;
      });
    }

    // Grade breakdown
    if (data.gradeBreakdown && typeof data.gradeBreakdown === "object") {
      syllabusContext += "\n\nGrade Breakdown:\n";
      for (const [cat, wt] of Object.entries(data.gradeBreakdown)) {
        syllabusContext += `- ${cat}: ${wt}%\n`;
      }
    }
  } catch (err) {
    console.error("Firestore fetch error:", err);
  }

  // ── RAG: fetch relevant chunks from Pinecone (optional) ──────────────────
  let ragContext = "";
  if (syllabusContext) {
    // We need pineconeNamespace — fetch it from the syllabus doc we already read
    try {
      const snap = await adminDb.collection("syllabi").doc(syllabusId).get();
      const ns: string = snap.data()?.pineconeNamespace ?? `syllabus-${syllabusId}`;
      const chunks = await queryPinecone(ns, question);
      if (chunks.length > 0) {
        ragContext = "\n\nRelevant Excerpts from Syllabus PDF:\n" + chunks.map((c, i) => `[${i + 1}] ${c}`).join("\n\n");
      }
    } catch {
      // non-fatal
    }
  }

  // ── Stream from Gemini ────────────────────────────────────────────────────
  const systemPrompt = `You are Syllabify, a helpful academic assistant. Answer questions concisely and accurately based only on the student's syllabus data provided below. If something isn't in the data, say so clearly.

Syllabus Data:
${syllabusContext || "No syllabus data available."}${ragContext}

After your answer, on a new line output "SOURCE: Syllabify Syllabus Data" if you used syllabus data.`;

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();
      try {
        const result = await genai.models.generateContentStream({
          model: "gemini-2.5-flash",
          contents: systemPrompt + "\n\nQuestion: " + question,
        });
        for await (const chunk of result) {
          const text = chunk.text;
          if (text) controller.enqueue(encoder.encode(text));
        }
      } catch (err) {
        console.error("Gemini streaming error:", err);
        controller.enqueue(encoder.encode("Sorry, I encountered an error. Please try again."));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: { "Content-Type": "text/plain; charset=utf-8" },
  });
}

