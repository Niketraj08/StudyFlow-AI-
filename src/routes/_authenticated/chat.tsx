import { createFileRoute } from "@tanstack/react-router";
import { authedFetch } from "@/lib/authed-fetch";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { motion } from "motion/react";
import ReactMarkdown from "react-markdown";
import { Sparkles, Send, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { chatMessagesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/chat")({
  head: () => ({ meta: [{ title: "AI Tutor — StudyFlow AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(chatMessagesQuery()),
  component: ChatPage,
});

const SUGGESTIONS = [
  "Explain photosynthesis simply",
  "Quiz me on calculus derivatives",
  "Summarize World War II in 5 points",
  "Help me solve: 3x + 7 = 22",
];

function ChatPage() {
  const { data: history } = useSuspenseQuery(chatMessagesQuery());
  const qc = useQueryClient();
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState<string>("");
  const [busy, setBusy] = useState(false);
  const [messages, setMessages] = useState(history);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { setMessages(history); }, [history]);
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, streaming]);

  const send = async (text: string) => {
    if (!text.trim() || busy) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;

    const userMsg = { id: crypto.randomUUID(), user_id: u.user.id, role: "user" as const, content: text, created_at: new Date().toISOString() };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setBusy(true);
    setStreaming("");

    await supabase.from("chat_messages").insert({ user_id: u.user.id, role: "user", content: text });

    try {
      const res = await authedFetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [...messages, userMsg].map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        if (res.status === 429) throw new Error("Rate limit — please try again in a moment.");
        if (res.status === 402) throw new Error("AI credits exhausted. Add credits to keep chatting.");
        throw new Error("AI error");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      let buffer = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const l = line.trim();
          if (!l.startsWith("data:")) continue;
          const data = l.slice(5).trim();
          if (data === "[DONE]") continue;
          try {
            const json = JSON.parse(data);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) { acc += delta; setStreaming(acc); }
          } catch { /* ignore */ }
        }
      }

      const asstMsg = { id: crypto.randomUUID(), user_id: u.user.id, role: "assistant" as const, content: acc, created_at: new Date().toISOString() };
      setMessages((m) => [...m, asstMsg]);
      setStreaming("");
      await supabase.from("chat_messages").insert({ user_id: u.user.id, role: "assistant", content: acc });
      qc.invalidateQueries({ queryKey: ["chat_messages"] });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Something went wrong");
      setStreaming("");
    } finally {
      setBusy(false);
    }
  };

  const clear = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("chat_messages").delete().eq("user_id", u.user.id);
    setMessages([]);
    qc.invalidateQueries({ queryKey: ["chat_messages"] });
  };

  return (
    <div className="flex h-dvh flex-col pb-24">
      <header className="flex items-center justify-between px-5 pb-3 pt-8">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl gradient-primary shadow-[var(--shadow-glow)]">
            <Sparkles className="h-5 w-5 text-white" strokeWidth={2.5} />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold leading-tight">AI Tutor</h1>
            <p className="text-xs text-muted-foreground">Ask anything, any subject</p>
          </div>
        </div>
        {messages.length > 0 && (
          <button onClick={clear} className="rounded-full p-2 text-muted-foreground hover:bg-muted" aria-label="Clear">
            <Trash2 className="h-4 w-4" />
          </button>
        )}
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-5">
        {messages.length === 0 && !streaming && (
          <div className="mt-10 space-y-4">
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-center">
              <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-3xl bg-primary-soft">
                <Sparkles className="h-8 w-8 text-primary" />
              </div>
              <h2 className="font-display text-xl font-bold">How can I help you learn?</h2>
              <p className="mt-1 text-sm text-muted-foreground">Explain, quiz, solve — I'm here for it.</p>
            </motion.div>
            <div className="grid gap-2">
              {SUGGESTIONS.map((s, i) => (
                <motion.button
                  key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }}
                  onClick={() => send(s)}
                  className="soft-card p-3 text-left text-sm transition active:scale-[0.98]"
                >
                  {s}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3 pb-4">
          {messages.map((m) => (
            <Bubble key={m.id} role={m.role} content={m.content} />
          ))}
          {streaming && <Bubble role="assistant" content={streaming} streaming />}
        </div>
      </div>

      <form
        onSubmit={(e) => { e.preventDefault(); send(input); }}
        className="fixed inset-x-0 bottom-24 mx-auto max-w-xl px-4"
      >
        <div className="glass-card flex items-center gap-2 rounded-full p-2 pl-5">
          <input
            value={input} onChange={(e) => setInput(e.target.value)}
            placeholder="Ask your tutor…"
            className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            disabled={busy}
          />
          <button
            type="submit" disabled={busy || !input.trim()}
            className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-white transition active:scale-95 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </form>
    </div>
  );
}

function Bubble({ role, content, streaming }: { role: string; content: string; streaming?: boolean }) {
  const isUser = role === "user";
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
      className={`flex ${isUser ? "justify-end" : "justify-start"}`}
    >
      <div className={`max-w-[85%] rounded-3xl px-4 py-3 text-sm leading-relaxed ${
        isUser ? "gradient-primary text-white rounded-br-md" : "bg-card border border-border rounded-bl-md"
      }`}>
        {isUser ? (
          <p className="whitespace-pre-wrap">{content}</p>
        ) : (
          <div className="prose prose-sm max-w-none prose-p:my-1 prose-ul:my-1 prose-li:my-0 prose-headings:my-2 prose-headings:font-display">
            <ReactMarkdown>{content || "…"}</ReactMarkdown>
            {streaming && <span className="ml-0.5 inline-block h-3 w-1 animate-pulse bg-primary" />}
          </div>
        )}
      </div>
    </motion.div>
  );
}
