import { createFileRoute } from "@tanstack/react-router";
import { LOVABLE_AI_URL, requireLovableApiKey } from "@/lib/ai-gateway.server";
import { requireUser } from "@/lib/require-user.server";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

const SYSTEM = `You are StudyFlow AI — a friendly, encouraging study tutor for students. 
- Explain difficult topics clearly, with short examples and analogies.
- When solving problems, show the steps.
- Keep answers focused and use markdown (headings, bullet lists, bold) for readability.
- If asked to generate a quiz or flashcards, format them as a clean markdown list.`;

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const auth = await requireUser(request);
        if (auth instanceof Response) return auth;
        const { messages } = (await request.json()) as { messages?: ChatMessage[] };
        if (!Array.isArray(messages)) {
          return new Response("messages required", { status: 400 });
        }

        const key = requireLovableApiKey();
        const upstream = await fetch(`${LOVABLE_AI_URL}/chat/completions`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${key}`,
          },
          body: JSON.stringify({
            model: "google/gemini-3-flash-preview",
            stream: true,
            messages: [{ role: "system", content: SYSTEM }, ...messages],
          }),
        });

        if (!upstream.ok) {
          const txt = await upstream.text().catch(() => "");
          return new Response(txt || "AI error", { status: upstream.status });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      },
    },
  },
});
