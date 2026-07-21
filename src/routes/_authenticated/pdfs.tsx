import { createFileRoute, Link } from "@tanstack/react-router";
import { authedFetch } from "@/lib/authed-fetch";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import ReactMarkdown from "react-markdown";
import { FileText, Upload, Sparkles, Send, X, Trash2, ChevronLeft, MessageSquareText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { pdfsQuery } from "@/lib/queries";
// extractPdf is dynamically imported inside upload() to keep pdfjs out of SSR

export const Route = createFileRoute("/_authenticated/pdfs")({
  ssr: false,
  head: () => ({ meta: [{ title: "PDF Learning — StudyFlow AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(pdfsQuery()),
  component: PdfsPage,
});

function PdfsPage() {
  const { data: pdfs } = useSuspenseQuery(pdfsQuery());
  const qc = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["pdfs"] });

  const upload = async (file: File) => {
    if (file.type !== "application/pdf") return toast.error("PDF files only");
    if (file.size > 20 * 1024 * 1024) return toast.error("Max 20MB");
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    setUploading(true);
    try {
      setProgress("Extracting text…");
      const { extractPdf } = await import("@/lib/pdf-extract");
      const { text, pageCount } = await extractPdf(file);

      setProgress("Uploading…");
      const path = `${u.user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("pdfs").upload(path, file, { contentType: "application/pdf" });
      if (upErr) throw upErr;

      setProgress("Saving…");
      const { data: row, error } = await supabase.from("pdfs").insert({
        user_id: u.user.id, name: file.name, storage_path: path,
        size_bytes: file.size, page_count: pageCount, extracted_text: text,
      }).select("id").single();
      if (error) throw error;

      setProgress("Generating summary…");
      const res = await authedFetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "summarize", text }),
      });
      if (res.ok) {
        const { summary } = await res.json();
        await supabase.from("pdfs").update({ summary }).eq("id", row.id);
      }
      toast.success("PDF ready");
      invalidate();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Upload failed");
    } finally {
      setUploading(false); setProgress("");
    }
  };

  const remove = async (id: string, path: string) => {
    await supabase.storage.from("pdfs").remove([path]);
    await supabase.from("pdfs").delete().eq("id", id);
    invalidate();
  };

  return (
    <div className="px-5 pb-6 pt-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">AI-powered</p>
          <h1 className="font-display text-3xl font-bold">PDF Learning</h1>
        </div>
        <button onClick={() => fileRef.current?.click()} disabled={uploading}
          className="flex h-11 items-center gap-1.5 rounded-full gradient-primary px-4 text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-95 disabled:opacity-60">
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          Upload
        </button>
        <input ref={fileRef} type="file" accept="application/pdf" className="hidden"
          onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
      </div>

      {uploading && (
        <div className="soft-card mb-4 flex items-center gap-3 p-4">
          <Loader2 className="h-5 w-5 animate-spin text-primary" />
          <div>
            <div className="text-sm font-semibold">Processing…</div>
            <div className="text-xs text-muted-foreground">{progress}</div>
          </div>
        </div>
      )}

      {pdfs.length === 0 ? (
        <div className="soft-card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">No PDFs yet</p>
            <p className="text-sm text-muted-foreground">Upload a study PDF for AI summary & Q&A</p>
          </div>
          <button onClick={() => fileRef.current?.click()} className="mt-2 rounded-2xl gradient-primary px-4 py-2 text-sm font-semibold text-white">
            Upload PDF
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {pdfs.map((p, i) => (
            <motion.button
              key={p.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              onClick={() => setOpenId(p.id)}
              className="soft-card group flex w-full items-center gap-3 p-4 text-left active:scale-[0.99]">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-coral/20 text-foreground">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{p.name}</div>
                <div className="mt-0.5 text-xs text-muted-foreground">
                  {p.page_count ?? 0} pages · {(Number(p.size_bytes ?? 0) / 1024 / 1024).toFixed(1)} MB
                  {p.summary && <span className="ml-2 inline-flex items-center gap-0.5 text-primary"><Sparkles className="h-3 w-3" /> Summary ready</span>}
                </div>
              </div>
              <button onClick={(e) => { e.stopPropagation(); remove(p.id, p.storage_path); }}
                className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {openId && <PdfViewer id={openId} onClose={() => setOpenId(null)} />}
      </AnimatePresence>

      <div className="mt-8 text-center">
        <Link to="/notes" className="text-xs font-semibold text-muted-foreground underline underline-offset-4">Or open notes</Link>
      </div>
    </div>
  );
}

function PdfViewer({ id, onClose }: { id: string; onClose: () => void }) {
  const [tab, setTab] = useState<"summary" | "chat" | "text">("summary");
  const { data: pdf, isLoading } = useSuspenseQuery<any>({
    queryKey: ["pdf", id],
    queryFn: async () => {
      const { data, error } = await supabase.from("pdfs").select("*").eq("id", id).single();
      if (error) throw error;
      return data;
    },
  } as any);

  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState("");
  const [chat, setChat] = useState<{ q: string; a: string }[]>([]);
  const [input, setInput] = useState("");
  const [asking, setAsking] = useState(false);

  const ask = async () => {
    if (!input.trim() || asking) return;
    const q = input.trim();
    setInput(""); setAsking(true);
    setChat((c) => [...c, { q, a: "" }]);
    try {
      const res = await authedFetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "qa", text: pdf.extracted_text, question: q }),
      });
      const { answer } = await res.json();
      setChat((c) => c.map((m, i) => (i === c.length - 1 ? { ...m, a: answer } : m)));
    } catch {
      toast.error("Failed to answer");
    } finally { setAsking(false); }
  };

  const highlighted = () => {
    const text = pdf?.extracted_text ?? "";
    if (!highlight.trim()) return text.slice(0, 8000);
    const parts = text.slice(0, 20000).split(new RegExp(`(${escapeReg(highlight)})`, "gi"));
    return parts.map((p: string, i: number) => p.toLowerCase() === highlight.toLowerCase()
      ? <mark key={i} className="bg-amber/50 rounded px-0.5">{p}</mark>
      : <span key={i}>{p}</span>
    );
  };

  return <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background" />
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} className="fixed inset-0 z-50 flex flex-col">
      <header className="flex items-center gap-3 px-5 pt-6 pb-3">
        <button onClick={onClose} className="rounded-full p-2 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
        <div className="min-w-0 flex-1">
          <div className="truncate font-display text-base font-bold">{pdf?.name ?? "Loading…"}</div>
          <div className="text-xs text-muted-foreground">{pdf?.page_count} pages</div>
        </div>
      </header>

      <div className="mx-5 mb-3 inline-flex self-start rounded-2xl bg-muted p-1">
        {(["summary", "chat", "text"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`rounded-xl px-4 py-1.5 text-xs font-semibold capitalize transition ${
              tab === t ? "bg-card shadow-sm text-foreground" : "text-muted-foreground"
            }`}>{t === "chat" ? "Ask" : t}</button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-32">
        {isLoading || !pdf ? (
          <div className="flex justify-center py-10"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : tab === "summary" ? (
          <div className="soft-card p-5">
            {pdf.summary ? (
              <div className="prose prose-sm max-w-none prose-headings:font-display prose-headings:my-2 prose-p:my-2">
                <ReactMarkdown>{pdf.summary}</ReactMarkdown>
              </div>
            ) : (
              <div className="py-6 text-center text-sm text-muted-foreground">
                <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
                Summary is being generated…
              </div>
            )}
          </div>
        ) : tab === "chat" ? (
          <div className="space-y-3">
            {chat.length === 0 && (
              <div className="soft-card p-5 text-center">
                <MessageSquareText className="mx-auto mb-2 h-6 w-6 text-primary" />
                <p className="text-sm font-semibold">Ask anything about this PDF</p>
                <p className="mt-1 text-xs text-muted-foreground">Answers come from the document itself.</p>
              </div>
            )}
            {chat.map((m, i) => (
              <div key={i} className="space-y-2">
                <div className="flex justify-end">
                  <div className="max-w-[85%] rounded-3xl gradient-primary rounded-br-md px-4 py-3 text-sm text-white">{m.q}</div>
                </div>
                <div className="flex justify-start">
                  <div className="max-w-[85%] rounded-3xl border border-border bg-card rounded-bl-md px-4 py-3 text-sm">
                    <div className="prose prose-sm max-w-none prose-p:my-1">
                      <ReactMarkdown>{m.a || "…"}</ReactMarkdown>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            <div className="relative mb-3">
              <input value={query} onChange={(e) => { setQuery(e.target.value); setHighlight(e.target.value); }}
                placeholder="Highlight text…"
                className="w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
            </div>
            <div className="soft-card whitespace-pre-wrap p-5 text-sm leading-relaxed">
              {highlighted()}
            </div>
          </div>
        )}
      </div>

      {tab === "chat" && (
        <form onSubmit={(e) => { e.preventDefault(); ask(); }}
          className="fixed inset-x-0 bottom-0 mx-auto max-w-xl px-4 pb-6">
          <div className="glass-card flex items-center gap-2 rounded-full p-2 pl-5">
            <input value={input} onChange={(e) => setInput(e.target.value)} disabled={asking}
              placeholder="Ask about this PDF…"
              className="flex-1 border-0 bg-transparent text-sm outline-none placeholder:text-muted-foreground" />
            <button type="submit" disabled={asking || !input.trim()}
              className="flex h-10 w-10 items-center justify-center rounded-full gradient-primary text-white disabled:opacity-50 active:scale-95">
              {asking ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>
        </form>
      )}
    </motion.div>
  </>;
}

function escapeReg(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
