import { createFileRoute } from "@tanstack/react-router";
import { useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Plus, Search, FileText, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { notesQuery } from "@/lib/queries";

export const Route = createFileRoute("/_authenticated/notes")({
  head: () => ({ meta: [{ title: "Notes — StudyFlow AI" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(notesQuery()),
  component: NotesPage,
});

function NotesPage() {
  const { data: notes } = useSuspenseQuery(notesQuery());
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState<{ id?: string; title: string; content: string } | null>(null);

  const filtered = useMemo(() =>
    notes.filter((n) => n.title.toLowerCase().includes(q.toLowerCase()) || n.content.toLowerCase().includes(q.toLowerCase())),
    [notes, q]);

  const save = async () => {
    if (!editing) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    if (editing.id) {
      const { error } = await supabase.from("notes").update({ title: editing.title, content: editing.content }).eq("id", editing.id);
      if (error) return toast.error(error.message);
    } else {
      const { error } = await supabase.from("notes").insert({ user_id: u.user.id, title: editing.title || "Untitled", content: editing.content });
      if (error) return toast.error(error.message);
    }
    setEditing(null);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["notes"] });
  };

  return (
    <div className="px-5 pb-6 pt-10">
      <div className="mb-4 flex items-end justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Your ideas</p>
          <h1 className="font-display text-3xl font-bold">Notes</h1>
        </div>
        <button
          onClick={() => setEditing({ title: "", content: "" })}
          className="flex h-11 w-11 items-center justify-center rounded-full gradient-primary shadow-[var(--shadow-glow)] active:scale-95"
        >
          <Plus className="h-5 w-5 text-white" strokeWidth={2.5} />
        </button>
      </div>

      <div className="relative mb-5">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={q} onChange={(e) => setQ(e.target.value)}
          placeholder="Search notes…"
          className="w-full rounded-2xl border border-border bg-card py-3 pl-11 pr-4 text-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="soft-card mt-6 flex flex-col items-center gap-3 p-10 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-soft">
            <FileText className="h-7 w-7 text-primary" />
          </div>
          <div>
            <p className="font-semibold">{q ? "No matches" : "No notes yet"}</p>
            <p className="text-sm text-muted-foreground">{q ? "Try a different search" : "Capture your first note"}</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-3">
          {filtered.map((n, i) => (
            <motion.button
              key={n.id}
              initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
              onClick={() => setEditing({ id: n.id, title: n.title, content: n.content })}
              className="soft-card group text-left p-4 transition active:scale-[0.99]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{n.title}</div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{n.content || "Empty note"}</p>
                  <div className="mt-2 text-xs text-muted-foreground">
                    {new Date(n.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); remove(n.id); }}
                  className="rounded-lg p-1.5 text-muted-foreground opacity-0 transition group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.button>
          ))}
        </div>
      )}

      <AnimatePresence>
        {editing && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setEditing(null)} className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm" />
            <motion.div
              initial={{ y: "100%" }} animate={{ y: 0 }} exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-0 z-50 mx-auto flex max-w-xl flex-col bg-background"
            >
              <div className="flex items-center justify-between border-b border-border p-4">
                <button onClick={() => setEditing(null)} className="rounded-full p-2 hover:bg-muted">
                  <X className="h-5 w-5" />
                </button>
                <button onClick={save} className="rounded-full gradient-primary px-4 py-2 text-sm font-semibold text-white">Save</button>
              </div>
              <input
                autoFocus value={editing.title} onChange={(e) => setEditing({ ...editing, title: e.target.value })}
                placeholder="Title"
                className="border-0 bg-transparent px-5 py-4 font-display text-2xl font-bold outline-none"
              />
              <textarea
                value={editing.content} onChange={(e) => setEditing({ ...editing, content: e.target.value })}
                placeholder="Start writing…"
                className="flex-1 resize-none border-0 bg-transparent px-5 pb-8 text-base leading-relaxed outline-none"
              />
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
