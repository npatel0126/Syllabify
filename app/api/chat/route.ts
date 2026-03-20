import { NextRequest } from "next/server";

// POST /api/chat
// Body: { question: string, syllabusId: string }
export async function POST(req: NextRequest) {
  const authorization = req.headers.get("authorization") ?? "";
  void authorization;

  const body = (await req.json()) as { question?: string; syllabusId?: string };
  const question = body.question ?? "";
  const syllabusId = body.syllabusId ?? "";

  // TODO: Verify auth, then call the Firebase Cloud Function that streams answers.
  // For scaffolding, return a placeholder streaming response.
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();
      controller.enqueue(encoder.encode(`TODO: answer for syllabus ${syllabusId}\n`));
      controller.enqueue(encoder.encode(`You asked: ${question}\n\n`));
      controller.enqueue(
        encoder.encode("Syllabify scaffolding: streamed token-by-token answer with citations will be implemented next.\nSOURCE: TODO")
      );
      controller.close();
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8"
    }
  });
}

