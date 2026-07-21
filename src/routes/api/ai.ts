import { createFileRoute } from "@tanstack/react-router";
import { LOVABLE_AI_URL, requireLovableApiKey } from "@/lib/ai-gateway.server";
import { requireUser } from "@/lib/require-user.server";

type Action = "summarize" | "qa" | "flashcards";

async function callAI(messages: { role: string; content: string }[], json = false) {
  const key = requireLovableApiKey();
  const res = await fetch(`${LOVABLE_AI_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3-flash-preview",
      messages,
      ...(json ? { response_format: { type: "json_object" } } : {}),
    }),
  });
  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Response(t || "AI error", { status: res.status });
  }
  const data = await res.json();
  return data.choices?.[0]?.message?.content ?? "";
}

export const Route = createFileRoute("/api/ai")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;
        const body = (await request.json()) as {
          action: Action;
          text?: string;
          question?: string;
          topic?: string;
          count?: number;
        };
        try {
          if (body.action === "summarize") {
            const text = (body.text ?? "").slice(0, 60000);
            const content = await callAI([
              { role: "system", content: "You are a study assistant. Produce a concise, well-structured markdown summary with headings and bullet points. Highlight key concepts in **bold**." },
              { role: "user", content: `Summarize this document:\n\n${text}` },
            ]);
            return Response.json({ summary: content });
          }
          if (body.action === "qa") {
            const text = (body.text ?? "").slice(0, 60000);
            const content = await callAI([
              { role: "system", content: "Answer the user's question using ONLY the provided document. Cite short quoted phrases from the document when possible. If the answer isn't in the document, say so." },
              { role: "user", content: `DOCUMENT:\n${text}\n\nQUESTION: ${body.question ?? ""}` },
            ]);
            return Response.json({ answer: content });
          }
          if (body.action === "flashcards") {
            const src = body.text?.slice(0, 40000) ?? body.topic ?? "";
            const count = Math.min(20, Math.max(3, body.count ?? 10));
            const content = await callAI(
              [
                { role: "system", content: `You generate study flashcards. Return ONLY JSON matching {"cards":[{"front":"question","back":"answer"}]}. Keep fronts as short questions and backs as concise answers. Generate ${count} cards.` },
                { role: "user", content: `Source:\n${src}` },
              ],
              true,
            );
            let cards: { front: string; back: string }[] = [];
            try {
              const parsed = JSON.parse(content);
              cards = Array.isArray(parsed.cards) ? parsed.cards : [];
            } catch { /* ignore */ }
            return Response.json({ cards });
          }
          return new Response("Unknown action", { status: 400 });
        } catch (err) {
          if (err instanceof Response) return err;
          return new Response(err instanceof Error ? err.message : "Error", { status: 500 });
        }
      },
    },
  },
});
