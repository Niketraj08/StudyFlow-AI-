import { createFileRoute } from "@tanstack/react-router";
import { authedFetch } from "@/lib/authed-fetch";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Layers, Plus, Sparkles, X, Trash2, ChevronLeft, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { flashcardsQuery, subjectsQuery } from "@/lib/queries";
import { sm2, qualityLabel } from "@/lib/sm2";

export const Route = createFileRoute("/_authenticated/flashcards")({
  head: () => ({ meta: [{ title: "Flashcards — StudyFlow AI" }] }),
  loader: async ({ context }) => {
    await Promise.all([
      context.queryClient.ensureQueryData(flashcardsQuery()),
      context.queryClient.ensureQueryData(subjectsQuery()),
    ]);
  },
  component: FlashcardsPage,
});

function FlashcardsPage() {
  const { data: cards } = useSuspenseQuery(flashcardsQuery());
  const { data: subjects } = useSuspenseQuery(subjectsQuery());
  const qc = useQueryClient();
  const [reviewOpen, setReviewOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);

  const now = Date.now();
  const due = useMemo(() => cards.filter((c) => new Date(c.due_at).getTime() <= now), [cards, now]);
  const bySubject = useMemo(() => {
    const map = new Map<string | null, typeof cards>();
    for (const c of cards) {
      const k = c.subject_id;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(c);
    }
    return map;
  }, [cards]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["flashcards"] });
  const removeCard = async (id: string) => {
    await supabase.from("flashcards").delete().eq("id", id);
    invalidate();
  };

  return (
    <div className="px-5 pb-6 pt-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Spaced repetition</p>
          <h1 className="font-display text-3xl font-bold">Flashcards</h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setAiOpen(true)}
            className="flex h-11 items-center gap-1.5 rounded-full bg-primary-soft px-3.5 text-sm font-semibold text-primary active:scale-95"
          >
            <Sparkles className="h-4 w-4" /> AI
          </button>
          <button
            onClick={() => setAddOpen(true)}
            className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary shadow-[var(--shadow-glow)] active:scale-95"
            aria-label="Add card"
          >
            <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
          </button>
        </div>
      </div>

      {/* Due today hero */}
      <motion.div
        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
        className="soft-card mb-4 flex items-center justify-between p-5"
      >
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Due today</div>
          <div className="mt-1 font-display text-3xl font-bold">{due.length}</div>
          <div className="text-xs text-muted-foreground">{cards.length} total cards</div>
        </div>
        <button
          onClick={() => (due.length ? setReviewOpen(true) : toast.info("Nothing due — you're caught up!"))}
          className="rounded-2xl gradient-primary px-4 py-2.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-95"
        >
          Review
        </button>
      </motion.div>

      {cards.length === 0 ? (
        <div className="soft-card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            <Layers className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">No flashcards yet</p>
            <p className="text-sm text-muted-foreground">Create manually or generate with AI</p>
          </div>
          <button onClick={() => setAiOpen(true)} className="mt-2 flex items-center gap-1.5 rounded-2xl gradient-primary px-4 py-2 text-sm font-semibold text-white">
            <Sparkles className="h-4 w-4" /> Generate with AI
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {[...bySubject.entries()].map(([sid, list]) => {
            const subj = subjects.find((s) => s.id === sid);
            return (
              <section key={sid ?? "none"}>
                <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {subj ? <><span>{subj.emoji}</span><span>{subj.name}</span></> : <span>General</span>}
                  <span className="text-muted-foreground">· {list.length}</span>
                </div>
                <div className="space-y-2">
                  {list.slice(0, 6).map((c) => (
                    <div key={c.id} className="soft-card group flex items-start justify-between gap-3 p-3">
                      <div className="min-w-0 flex-1">
                        <div className="line-clamp-2 text-sm font-semibold">{c.front}</div>
                        <div className="mt-0.5 line-clamp-1 text-xs text-muted-foreground">{c.back}</div>
                      </div>
                      <button onClick={() => removeCard(c.id)} className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  ))}
                  {list.length > 6 && <p className="pl-1 text-xs text-muted-foreground">+ {list.length - 6} more</p>}
                </div>
              </section>
            );
          })}
        </div>
      )}

      <AnimatePresence>
        {reviewOpen && <ReviewSession cards={due} onClose={() => { setReviewOpen(false); invalidate(); }} />}
        {addOpen && <AddCardSheet subjects={subjects} onClose={() => { setAddOpen(false); invalidate(); }} />}
        {aiOpen && <AiGenerateSheet subjects={subjects} onClose={() => { setAiOpen(false); invalidate(); }} />}
      </AnimatePresence>
    </div>
  );
}

function ReviewSession({ cards, onClose }: { cards: any[]; onClose: () => void }) {
  const [idx, setIdx] = useState(0);
  const [showBack, setShowBack] = useState(false);
  const [queue] = useState(cards);
  const card = queue[idx];

  const grade = async (q: 0 | 3 | 4 | 5) => {
    const next = sm2({ ease: card.ease, interval_days: card.interval_days, reps: card.reps }, q);
    await supabase.from("flashcards").update(next).eq("id", card.id);
    setShowBack(false);
    if (idx + 1 >= queue.length) onClose();
    else setIdx(idx + 1);
  };

  if (!card) return null;

  return (
    <>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 bg-background" />
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex flex-col">
        <div className="flex items-center justify-between px-5 pt-6">
          <button onClick={onClose} className="rounded-full p-2 hover:bg-muted"><ChevronLeft className="h-5 w-5" /></button>
          <div className="text-sm font-semibold text-muted-foreground">{idx + 1} / {queue.length}</div>
          <div className="w-9" />
        </div>
        <div className="flex flex-1 items-center justify-center px-6">
          <motion.div
            key={card.id + (showBack ? "b" : "f")}
            initial={{ rotateY: -90, opacity: 0 }} animate={{ rotateY: 0, opacity: 1 }} transition={{ duration: 0.35 }}
            className="soft-card w-full max-w-md p-8 text-center min-h-[300px] flex items-center justify-center"
            onClick={() => setShowBack((v) => !v)}
          >
            <div>
              <div className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {showBack ? "Answer" : "Question"}
              </div>
              <div className="font-display text-2xl font-bold leading-snug">{showBack ? card.back : card.front}</div>
              {!showBack && <div className="mt-6 text-xs text-muted-foreground">Tap card to reveal</div>}
            </div>
          </motion.div>
        </div>
        <div className="p-5 pb-8">
          {showBack ? (
            <div className="grid grid-cols-4 gap-2">
              {([0, 3, 4, 5] as const).map((q) => (
                <button key={q} onClick={() => grade(q)}
                  className={`rounded-2xl py-3 text-xs font-semibold text-white active:scale-95 ${
                    q === 0 ? "bg-destructive" : q === 3 ? "bg-coral" : q === 4 ? "bg-primary" : "bg-mint"
                  }`}>{qualityLabel(q)}</button>
              ))}
            </div>
          ) : (
            <button onClick={() => setShowBack(true)}
              className="w-full rounded-2xl gradient-primary py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)]">
              Show answer
            </button>
          )}
        </div>
      </motion.div>
    </>
  );
}

function AddCardSheet({ subjects, onClose }: { subjects: any[]; onClose: () => void }) {
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const [subjectId, setSubjectId] = useState<string | "">("");

  const save = async () => {
    if (!front.trim() || !back.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("flashcards").insert({
      user_id: u.user.id, front: front.trim(), back: back.trim(),
      subject_id: subjectId || null,
    });
    if (error) return toast.error(error.message);
    onClose();
  };

  return <Sheet onClose={onClose} title="New card">
    <label className="block text-xs font-semibold text-muted-foreground">FRONT</label>
    <textarea value={front} onChange={(e) => setFront(e.target.value)} rows={2}
      placeholder="What's the mitochondria?"
      className="mt-1 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
    <label className="mt-4 block text-xs font-semibold text-muted-foreground">BACK</label>
    <textarea value={back} onChange={(e) => setBack(e.target.value)} rows={3}
      placeholder="The powerhouse of the cell — produces ATP via cellular respiration."
      className="mt-1 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
    <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} />
    <button onClick={save} className="mt-6 w-full rounded-2xl gradient-primary py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-[0.98]">
      Save card
    </button>
  </Sheet>;
}

function AiGenerateSheet({ subjects, onClose }: { subjects: any[]; onClose: () => void }) {
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(8);
  const [subjectId, setSubjectId] = useState<string | "">("");
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<{ front: string; back: string }[]>([]);

  const generate = async () => {
    if (!topic.trim() && preview.length === 0) return;
    setBusy(true);
    try {
      const res = await authedFetch("/api/ai", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "flashcards", topic, count }),
      });
      if (!res.ok) {
        if (res.status === 429) throw new Error("Rate limit — try again in a moment");
        if (res.status === 402) throw new Error("AI credits exhausted");
        throw new Error("AI failed");
      }
      const { cards } = await res.json();
      if (!cards?.length) throw new Error("No cards generated");
      setPreview(cards);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally { setBusy(false); }
  };

  const save = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const rows = preview.map((c) => ({ user_id: u.user!.id, front: c.front, back: c.back, subject_id: subjectId || null }));
    const { error } = await supabase.from("flashcards").insert(rows);
    if (error) return toast.error(error.message);
    toast.success(`Added ${rows.length} cards`);
    onClose();
  };

  return <Sheet onClose={onClose} title="AI flashcards">
    {preview.length === 0 ? <>
      <label className="block text-xs font-semibold text-muted-foreground">TOPIC OR NOTES</label>
      <textarea autoFocus value={topic} onChange={(e) => setTopic(e.target.value)} rows={4}
        placeholder="Photosynthesis — light and dark reactions"
        className="mt-1 w-full resize-none rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10" />
      <label className="mt-4 block text-xs font-semibold text-muted-foreground">HOW MANY · {count}</label>
      <input type="range" min={3} max={20} value={count} onChange={(e) => setCount(+e.target.value)} className="mt-2 w-full accent-primary" />
      <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} />
      <button onClick={generate} disabled={busy || !topic.trim()}
        className="mt-6 flex w-full items-center justify-center gap-2 rounded-2xl gradient-primary py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-[0.98] disabled:opacity-60">
        <Sparkles className="h-4 w-4" /> {busy ? "Generating…" : "Generate"}
      </button>
    </> : <>
      <div className="mb-2 flex items-center justify-between">
        <p className="text-sm font-semibold">{preview.length} cards</p>
        <button onClick={() => setPreview([])} className="flex items-center gap-1 text-xs font-semibold text-primary">
          <RotateCcw className="h-3.5 w-3.5" /> Regenerate
        </button>
      </div>
      <div className="max-h-[45vh] space-y-2 overflow-y-auto">
        {preview.map((c, i) => (
          <div key={i} className="soft-card p-3">
            <div className="text-sm font-semibold">{c.front}</div>
            <div className="mt-1 text-xs text-muted-foreground">{c.back}</div>
          </div>
        ))}
      </div>
      <SubjectPicker subjects={subjects} value={subjectId} onChange={setSubjectId} />
      <button onClick={save} className="mt-4 w-full rounded-2xl gradient-primary py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-[0.98]">
        Save all
      </button>
    </>}
  </Sheet>;
}

function SubjectPicker({ subjects, value, onChange }: { subjects: any[]; value: string; onChange: (v: string) => void }) {
  return <>
    <label className="mt-4 block text-xs font-semibold text-muted-foreground">SUBJECT</label>
    <div className="mt-2 flex flex-wrap gap-2">
      <button onClick={() => onChange("")}
        className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${value === "" ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>None</button>
      {subjects.map((s) => (
        <button key={s.id} onClick={() => onChange(s.id)}
          className={`rounded-xl px-3 py-1.5 text-xs font-semibold transition ${value === s.id ? "bg-primary text-white" : "bg-muted text-muted-foreground"}`}>
          {s.emoji} {s.name}
        </button>
      ))}
    </div>
  </>;
}

function Sheet({ children, title, onClose }: { children: React.ReactNode; title: string; onClose: () => void }) {
  return <>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      onClick={onClose} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
    <motion.div initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
      transition={{ type: "spring", damping: 30, stiffness: 300 }}
      className="fixed inset-x-0 bottom-0 z-50 mx-auto max-h-[90dvh] max-w-xl overflow-y-auto rounded-t-3xl bg-card p-6 shadow-2xl">
      <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
      <div className="mb-5 flex items-center justify-between">
        <h2 className="font-display text-xl font-bold">{title}</h2>
        <button onClick={onClose} className="rounded-full p-1.5 hover:bg-muted"><X className="h-5 w-5" /></button>
      </div>
      {children}
    </motion.div>
  </>;
}
