import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, X, BookOpen, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { subjectsQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/subjects")({
  head: () => ({ meta: [{ title: "Subjects — StudyFlow AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(subjectsQuery()),
  component: SubjectsPage,
});

const COLORS = ["#7C5CFF", "#FF6B6B", "#4ECDC4", "#FFD166", "#06AED5", "#F78CA2", "#8AC926"];
const EMOJIS = ["📘", "🧮", "🧪", "🌍", "🎨", "💻", "🎼", "🧬", "📐", "📜"];

function SubjectsPage() {
  const { data: subjects } = useSuspenseQuery(subjectsQuery());
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [color, setColor] = useState(COLORS[0]);
  const [emoji, setEmoji] = useState(EMOJIS[0]);

  const create = async () => {
    if (!name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("subjects").insert({ user_id: u.user.id, name: name.trim(), color, emoji });
    if (error) return toast.error(error.message);
    setName(""); setOpen(false);
    qc.invalidateQueries({ queryKey: ["subjects"] });
    toast.success("Subject added");
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("subjects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["subjects"] });
  };

  return (
    <div className="px-5 pb-6 pt-10">
      <div className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Your library</p>
          <h1 className="font-display text-3xl font-bold">Subjects</h1>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary shadow-[var(--shadow-glow)] active:scale-95"
          aria-label="Add subject"
        >
          <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
        </button>
      </div>

      {subjects.length === 0 ? (
        <div className="soft-card mt-8 flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            <BookOpen className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">No subjects yet</p>
            <p className="text-sm text-muted-foreground">Add your first subject to start tracking</p>
          </div>
          <button onClick={() => setOpen(true)} className="mt-2 rounded-2xl gradient-primary px-4 py-2 text-sm font-semibold text-white">
            Add subject
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {subjects.map((s, i) => (
            <motion.div
              key={s.id}
              initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="soft-card group flex items-center gap-4 p-4"
            >
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl text-2xl"
                style={{ background: `${s.color}22`, color: s.color }}
              >
                {s.emoji}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-semibold">{s.name}</div>
                <div className="mt-1 flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{s.study_minutes} min</span>
                  <span>·</span>
                  <span>{s.progress}% complete</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full" style={{ width: `${s.progress}%`, background: s.color }} />
                </div>
              </div>
              <button
                onClick={() => remove(s.id)}
                className="rounded-xl p-2 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 z-50 mx-auto max-w-xl rounded-t-3xl bg-card p-6 shadow-2xl"
            >
              <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-border" />
              <div className="mb-5 flex items-center justify-between">
                <h2 className="font-display text-xl font-bold">New subject</h2>
                <button onClick={() => setOpen(false)} className="rounded-full p-1.5 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
              </div>

              <label className="block text-xs font-semibold text-muted-foreground">NAME</label>
              <input
                autoFocus value={name} onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Organic Chemistry"
                className="mt-1 w-full rounded-2xl border border-border bg-background px-4 py-3 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />

              <label className="mt-4 block text-xs font-semibold text-muted-foreground">ICON</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {EMOJIS.map((e) => (
                  <button key={e} onClick={() => setEmoji(e)}
                    className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition ${
                      emoji === e ? "bg-primary-soft ring-2 ring-primary" : "bg-muted"
                    }`}>{e}</button>
                ))}
              </div>

              <label className="mt-4 block text-xs font-semibold text-muted-foreground">COLOR</label>
              <div className="mt-2 flex flex-wrap gap-2">
                {COLORS.map((c) => (
                  <button key={c} onClick={() => setColor(c)}
                    className={`h-9 w-9 rounded-full transition ${color === c ? "ring-2 ring-offset-2 ring-primary" : ""}`}
                    style={{ background: c }} />
                ))}
              </div>

              <button
                onClick={create}
                className="mt-6 w-full rounded-2xl gradient-primary py-3.5 text-sm font-semibold text-white shadow-[var(--shadow-glow)] active:scale-[0.98]"
              >
                Create subject
              </button>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
